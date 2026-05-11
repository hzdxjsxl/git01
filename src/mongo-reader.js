const { Readable } = require('stream');
const { MongoClient } = require('mongodb');

class MongoReader extends Readable {
  constructor(options = {}) {
    super({ objectMode: true, highWaterMark: 1000 });
    
    this.mongoUri = options.mongoUri || process.env.MONGO_URI;
    this.dbName = options.dbName || process.env.MONGO_DB;
    this.collectionName = options.collectionName || 'orders';
    this.query = options.query || {};
    this.projection = options.projection || {};
    this.batchSize = options.batchSize || 1000;
    
    this.client = null;
    this.db = null;
    this.collection = null;
    this.cursor = null;
  }

  async _connect() {
    if (this.client) return;
    
    this.client = new MongoClient(this.mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000
    });
    
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection(this.collectionName);
  }

  async _read(size) {
    try {
      if (!this.cursor) {
        await this._connect();
        
        this.cursor = this.collection.find(this.query, {
          projection: this.projection,
          batchSize: this.batchSize,
          noCursorTimeout: true
        }).stream();
        
        this.cursor.on('data', (doc) => {
          if (!this.push(doc)) {
            this.cursor.pause();
          }
        });
        
        this.cursor.on('end', () => {
          this.push(null);
          this._cleanup();
        });
        
        this.cursor.on('error', (err) => {
          this.emit('error', err);
          this._cleanup();
        });
      } else {
        this.cursor.resume();
      }
    } catch (err) {
      this.emit('error', err);
      this._cleanup();
    }
  }

  async _cleanup() {
    if (this.cursor) {
      await this.cursor.close();
      this.cursor = null;
    }
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
    }
  }
}

module.exports = MongoReader;
