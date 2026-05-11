#!/usr/bin/env node
const { program } = require('commander');
const { pipeline } = require('stream/promises');
const MongoReader = require('./mongo-reader');
const OrderTransform = require('./transform');
const EsBulkWriter = require('./es-bulk-writer');

program
  .name('mongo-to-es')
  .description('Node.js CLI tool to migrate MongoDB order data to Elasticsearch using streams')
  .version('1.0.0');

const migrateAction = async (options) => {
  try {
    console.log('=== Starting MongoDB to Elasticsearch Migration ===\n');
    
    const query = JSON.parse(options.query);
    
    const startTime = Date.now();
    
    const mongoReader = new MongoReader({
      mongoUri: options.mongoUri,
      dbName: options.mongoDb,
      collectionName: options.mongoCollection,
      query: query,
      batchSize: parseInt(options.mongoBatchSize),
      highWaterMark: parseInt(options.readerHighWaterMark)
    });
    
    const orderTransform = new OrderTransform({
      dateFormat: options.dateFormat
    });
    
    const esBulkWriter = new EsBulkWriter({
      esUri: options.esUri,
      indexName: options.esIndex,
      batchSize: parseInt(options.esBatchSize),
      maxBufferSize: parseInt(options.esMaxBufferSize),
      concurrency: parseInt(options.esConcurrency)
    });
    
    console.log('Configuration:');
    console.log(`  MongoDB URI: ${options.mongoUri || 'Using MONGO_URI environment variable'}`);
    console.log(`  MongoDB Database: ${options.mongoDb || 'Using MONGO_DB environment variable'}`);
    console.log(`  MongoDB Collection: ${options.mongoCollection}`);
    console.log(`  Elasticsearch URI: ${options.esUri || 'Using ES_URI environment variable'}`);
    console.log(`  Elasticsearch Index: ${options.esIndex}`);
    console.log(`  Query: ${JSON.stringify(query)}`);
    console.log(`  MongoDB Batch Size: ${options.mongoBatchSize}`);
    console.log(`  Elasticsearch Batch Size: ${options.esBatchSize}`);
    console.log(`  Elasticsearch Max Buffer Size: ${options.esMaxBufferSize}`);
    console.log(`  Elasticsearch Concurrency: ${options.esConcurrency}`);
    console.log(`  Date Format: ${options.dateFormat}\n`);
    
    console.log('Starting data migration pipeline...\n');
    
    await pipeline(
      mongoReader,
      orderTransform,
      esBulkWriter
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n=== Migration Completed in ${duration.toFixed(2)} seconds ===`);
    console.log('Migration completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('\nMigration failed with error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

program
  .command('migrate')
  .description('Migrate MongoDB order data to Elasticsearch')
  .option('--mongo-uri <uri>', 'MongoDB connection URI (e.g., mongodb://localhost:27017)')
  .option('--mongo-db <db>', 'MongoDB database name')
  .option('--mongo-collection <collection>', 'MongoDB collection name', 'orders')
  .option('--es-uri <uri>', 'Elasticsearch connection URI (e.g., http://localhost:9200)')
  .option('--es-index <index>', 'Elasticsearch index name', 'orders')
  .option('--query <json>', 'MongoDB query as JSON string', '{}')
  .option('--mongo-batch-size <number>', 'MongoDB cursor batch size', '1000')
  .option('--es-batch-size <number>', 'Elasticsearch bulk batch size', '500')
  .option('--es-max-buffer-size <number>', 'Elasticsearch writer max buffer size', '2000')
  .option('--es-concurrency <number>', 'Elasticsearch concurrent bulk requests', '1')
  .option('--reader-high-water-mark <number>', 'MongoDB reader high water mark', '500')
  .option('--date-format <format>', 'Date output format: ISO or timestamp', 'ISO')
  .action(migrateAction);

program
  .command('sync')
  .description('Sync MongoDB order data to Elasticsearch (alias for migrate)')
  .option('--mongo-uri <uri>', 'MongoDB connection URI (e.g., mongodb://localhost:27017)')
  .option('--mongo-db <db>', 'MongoDB database name')
  .option('--mongo-collection <collection>', 'MongoDB collection name', 'orders')
  .option('--es-uri <uri>', 'Elasticsearch connection URI (e.g., http://localhost:9200)')
  .option('--es-index <index>', 'Elasticsearch index name', 'orders')
  .option('--query <json>', 'MongoDB query as JSON string', '{}')
  .option('--mongo-batch-size <number>', 'MongoDB cursor batch size', '1000')
  .option('--es-batch-size <number>', 'Elasticsearch bulk batch size', '500')
  .option('--es-max-buffer-size <number>', 'Elasticsearch writer max buffer size', '2000')
  .option('--es-concurrency <number>', 'Elasticsearch concurrent bulk requests', '1')
  .option('--reader-high-water-mark <number>', 'MongoDB reader high water mark', '500')
  .option('--date-format <format>', 'Date output format: ISO or timestamp', 'ISO')
  .action(migrateAction);

program.parse(process.argv);
