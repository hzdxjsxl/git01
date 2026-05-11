const { Writable } = require('stream');
const elasticsearch = require('elasticsearch');

class EsBulkWriter extends Writable {
  constructor(options = {}) {
    super({ objectMode: true, highWaterMark: 100 });
    
    this.esUri = options.esUri || process.env.ES_URI;
    this.indexName = options.indexName || 'orders';
    this.batchSize = options.batchSize || 500;
    this.flushInterval = options.flushInterval || 5000;
    this.idField = options.idField || 'id';
    
    this.client = null;
    this.buffer = [];
    this.flushTimer = null;
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
      log: 'error'
    });
  }

  _write(chunk, encoding, callback) {
    this.buffer.push(chunk);
    
    if (this.buffer.length >= this.batchSize) {
      this._flushBuffer()
        .then(() => callback())
        .catch(callback);
    } else {
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this._flushBuffer();
        }, this.flushInterval);
      }
      callback();
    }
  }

  async _flushBuffer() {
    if (this.buffer.length === 0) return;
    
    const currentBatch = this.buffer.splice(0, this.batchSize);
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    await this._connect();
    
    const bulkBody = [];
    currentBatch.forEach((doc) => {
      const docId = doc[this.idField];
      bulkBody.push({
        index: {
          _index: this.indexName,
          _id: docId
        }
      });
      bulkBody.push(doc);
    });
    
    this.stats.total += currentBatch.length;
    
    try {
      const response = await this.client.bulk({
        body: bulkBody,
        refresh: false
      });
      
      if (response.errors) {
        response.items.forEach((item, index) => {
          if (item.index && item.index.error) {
            this.stats.failed++;
            console.error(`Error indexing document ${currentBatch[index]?.[this.idField]}:`, item.index.error);
          } else {
            this.stats.success++;
          }
        });
      } else {
        this.stats.success += currentBatch.length;
      }
      
      console.log(`Indexed ${currentBatch.length} documents. Total: ${this.stats.success}, Failed: ${this.stats.failed}`);
      
    } catch (err) {
      this.stats.failed += currentBatch.length;
      console.error('Bulk index error:', err.message);
      throw err;
    }
  }

  async _final(callback) {
    try {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      
      await this._flushBuffer();
      
      console.log('\n=== Migration Complete ===');
      console.log(`Total documents: ${this.stats.total}`);
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
