const mongoose = require('mongoose');
const SensorData = require('../server/models/SensorData');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agri_sensors';

const CONFIG = {
  sensorCount: 3000,
  centerLat: 39.9,
  centerLng: 116.4,
  radiusDegrees: 0.5,
  humidityRange: { min: 20, max: 85 }
};

function generateRandomPoint(centerLat, centerLng, radiusDegrees) {
  const u = Math.random();
  const v = Math.random();
  const w = radiusDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return {
    latitude: centerLat + x,
    longitude: centerLng + y
  };
}

function generateHumidity(latitude, longitude) {
  const centerLat = CONFIG.centerLat;
  const centerLng = CONFIG.centerLng;
  const distFromCenter = Math.sqrt(
    Math.pow(latitude - centerLat, 2) +
    Math.pow(longitude - centerLng, 2)
  );
  const normalizedDist = distFromCenter / CONFIG.radiusDegrees;
  const baseHumidity = CONFIG.humidityRange.min + 
    (CONFIG.humidityRange.max - CONFIG.humidityRange.min) * 
    (1 - normalizedDist);
  const noise = (Math.random() - 0.5) * 15;
  return Math.max(CONFIG.humidityRange.min, 
    Math.min(CONFIG.humidityRange.max, baseHumidity + noise));
}

async function generateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await SensorData.deleteMany({});
    console.log('Cleared existing data');

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < CONFIG.sensorCount; i += batchSize) {
      const sensorData = [];
      
      for (let j = 0; j < batchSize && (i + j) < CONFIG.sensorCount; j++) {
        const point = generateRandomPoint(
          CONFIG.centerLat,
          CONFIG.centerLng,
          CONFIG.radiusDegrees
        );
        
        const humidity = generateHumidity(point.latitude, point.longitude);
        
        sensorData.push({
          sensorId: `SENSOR_${String(i + j).padStart(6, '0')}`,
          location: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude]
          },
          humidity: humidity,
          timestamp: new Date()
        });
      }

      if (sensorData.length > 0) {
        await SensorData.insertMany(sensorData);
        insertedCount += sensorData.length;
        console.log(`Inserted ${insertedCount}/${CONFIG.sensorCount} sensors...`);
      }
    }

    console.log('Data generation completed!');
    console.log(`Total sensors: ${CONFIG.sensorCount}`);
    console.log(`Center: (${CONFIG.centerLat}, ${CONFIG.centerLng})`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

generateData();
