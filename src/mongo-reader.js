const { Readable } = require('stream');
const { MongoClient } = require('mongodb');

class MongoReader extends Readable {
  constructor(options = {}) {
    super({ 
      objectMode: true, 
      highWaterMark: options.highWaterMark || 500 
    });
    
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
    this.isReading = false;
    this.cursorStream = null;
    this.documentsRead = 0;
  }

  async _connect() {
    if (this.client) return;
    
    console.log(`Connecting to MongoDB: ${this.mongoUri}/${this.dbName}`);
    
    this.client = new MongoClient(this.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 360000
    });
    
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection(this.collectionName);
    
    console.log(`Connected to MongoDB database: ${this.dbName}`);
    
    const count = await this.collection.countDocuments(this.query);
    console.log(`Total documents to process: ${count}`);
  }

  _read(size) {
    if (this.isReading) return;
    this.isReading = true;
    
    this._startReading().catch((err) => {
      this.isReading = false;
      this.emit('error', err);
      this._cleanup();
    });
  }

  async _startReading() {
    if (!this.cursorStream) {
      await this._connect();
      
      const cursor = this.collection.find(this.query, {
        projection: this.projection,
        batchSize: this.batchSize,
        noCursorTimeout: true,
        allowPartialResults: false
      });
      
      this.cursorStream = cursor.stream();
      
      this.cursorStream.on('data', (doc) => {
        this.documentsRead++;
        
        if (this.documentsRead % 10000 === 0) {
          console.log(`Read ${this.documentsRead} documents from MongoDB...`);
        }
        
        if (!this.push(doc)) {
          this.cursorStream.pause();
        }
      });
      
      this.cursorStream.on('end', () => {
        console.log(`Finished reading ${this.documentsRead} documents from MongoDB`);
        this.push(null);
        this._cleanup();
      });
      
      this.cursorStream.on('error', (err) => {
        console.error('MongoDB cursor error:', err.message);
        this.emit('error', err);
        this._cleanup();
      });
      
      this.cursorStream.on('close', () => {
        this.isReading = false;
      });
      
    } else {
      if (this.cursorStream.isPaused()) {
        this.cursorStream.resume();
      }
    }
    
    this.isReading = false;
  }

  async _cleanup() {
    try {
      if (this.cursorStream) {
        this.cursorStream.destroy();
        this.cursorStream = null;
      }
      
      if (this.client) {
        console.log('Closing MongoDB connection...');
        await this.client.close();
        this.client = null;
        this.db = null;
        this.collection = null;
      }
    } catch (err) {
      console.error('Error during cleanup:', err.message);
    }
  }

  _destroy(err, callback) {
    this._cleanup().then(() => {
      callback(err);
    }).catch((cleanupErr) => {
      console.error('Error in destroy:', cleanupErr.message);
      callback(err || cleanupErr);
    });
  }
}

module.exports = MongoReader;
