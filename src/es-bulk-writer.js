const { Writable } = require('stream');
const elasticsearch = require('elasticsearch');

class EsBulkWriter extends Writable {
  constructor(options = {}) {
    super({ objectMode: true, highWaterMark: 100 });
    
    this.esUri = options.esUri || process.env.ES_URI;
    this.indexName = options.indexName || 'orders';
    this.batchSize = options.batchSize || 500;
    this.maxBufferSize = options.maxBufferSize || 2000;
    this.idField = options.idField || 'id';
    this.concurrency = options.concurrency || 1;
    
    this.client = null;
    this.buffer = [];
    this.pendingCallbacks = [];
    this.isFlushing = false;
    this.activeRequests = 0;
    this.stats = {
      total: 0,
      success: 0,
      failed: 0
    };
  }

  async _connect() {
    if (this.client) return;
    
    this.client = new elasticsearch.Client({
      host: this.esUri,
      log: 'error',
      maxRetries: 3,
      requestTimeout: 60000
    });
  }

  _write(chunk, encoding, callback) {
    this.buffer.push(chunk);
    this.stats.total++;
    
    if (this.buffer.length >= this.batchSize) {
      if (this.activeRequests < this.concurrency) {
        this._processBatch(callback);
      } else {
        this.pendingCallbacks.push(callback);
      }
    } else {
      if (this.buffer.length >= this.maxBufferSize) {
        if (this.activeRequests < this.concurrency) {
          this._processBatch(callback);
        } else {
          this.pendingCallbacks.push(callback);
        }
      } else {
        callback();
      }
    }
  }

  _writev(chunks, callback) {
    for (const chunk of chunks) {
      this.buffer.push(chunk.chunk);
      this.stats.total++;
    }
    
    if (this.buffer.length >= this.batchSize || this.buffer.length >= this.maxBufferSize) {
      if (this.activeRequests < this.concurrency) {
        this._processBatch(callback);
      } else {
        this.pendingCallbacks.push(callback);
      }
    } else {
      callback();
    }
  }

  async _processBatch(callback) {
    if (this.buffer.length === 0) {
      if (callback) callback();
      return;
    }
    
    this.activeRequests++;
    
    const batchToProcess = [];
    const batchSize = Math.min(this.buffer.length, this.batchSize);
    
    for (let i = 0; i < batchSize; i++) {
      batchToProcess.push(this.buffer.shift());
    }
    
    try {
      await this._connect();
      await this._sendToEs(batchToProcess);
      
      this.activeRequests--;
      
      if (callback) callback();
      
      if (this.pendingCallbacks.length > 0 && this.buffer.length >= this.batchSize) {
        const pendingCallback = this.pendingCallbacks.shift();
        this._processBatch(pendingCallback);
      } else if (this.buffer.length >= this.batchSize && this.activeRequests < this.concurrency) {
        this._processBatch();
      }
      
    } catch (err) {
      this.activeRequests--;
      this.stats.failed += batchToProcess.length;
      console.error('Batch processing error:', err.message);
      
      if (callback) callback(err);
      
      while (this.pendingCallbacks.length > 0) {
        const pendingCallback = this.pendingCallbacks.shift();
        pendingCallback(err);
      }
    }
  }

  async _sendToEs(batch) {
    const bulkBody = [];
    
    for (const doc of batch) {
      const docId = doc[this.idField];
      bulkBody.push({
        index: {
          _index: this.indexName,
          _id: docId
        }
      });
      bulkBody.push(doc);
    }
    
    try {
      const response = await this.client.bulk({
        body: bulkBody,
        refresh: false
      });
      
      if (response.errors) {
        let batchSuccess = 0;
        let batchFailed = 0;
        
        response.items.forEach((item, index) => {
          if (item.index && item.index.error) {
            batchFailed++;
            console.error(`Error indexing document ${batch[index]?.[this.idField]}:`, item.index.error);
          } else {
            batchSuccess++;
          }
        });
        
        this.stats.success += batchSuccess;
        this.stats.failed += batchFailed;
        console.log(`Indexed ${batch.length} documents: ${batchSuccess} success, ${batchFailed} failed. Total: ${this.stats.success}`);
      } else {
        this.stats.success += batch.length;
        console.log(`Indexed ${batch.length} documents. Total success: ${this.stats.success}`);
      }
      
    } catch (err) {
      this.stats.failed += batch.length;
      console.error('Bulk API error:', err.message);
      throw err;
    }
  }

  async _final(callback) {
    try {
      while (this.activeRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      while (this.buffer.length > 0) {
        const batchToProcess = [];
        const batchSize = Math.min(this.buffer.length, this.batchSize);
        
        for (let i = 0; i < batchSize; i++) {
          batchToProcess.push(this.buffer.shift());
        }
        
        await this._sendToEs(batchToProcess);
      }
      
      console.log('\n=== Migration Complete ===');
      console.log(`Total documents processed: ${this.stats.total}`);
      console.log(`Successfully indexed: ${this.stats.success}`);
      console.log(`Failed: ${this.stats.failed}`);
      
      if (this.client) {
        await this.client.close();
      }
      
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = EsBulkWriter;
