const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const SensorData = require('./models/SensorData');

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agri_sensors';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/dist', express.static(path.join(__dirname, '../dist')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

let mongoConnected = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    mongoConnected = true;
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    mongoConnected = false;
    console.error('MongoDB connection error:', err);
    console.log('Using mock data mode');
  });

function generateMockSensorData(count = 3000) {
  const centerLat = 39.9;
  const centerLng = 116.4;
  const radius = 0.5;
  const data = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * radius;
    const lat = centerLat + r * Math.cos(angle);
    const lng = centerLng + r * Math.sin(angle);
    
    const distFromCenter = Math.sqrt(
      Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2)
    );
    const normalizedDist = distFromCenter / radius;
    const baseHumidity = 20 + 65 * (1 - normalizedDist);
    const noise = (Math.random() - 0.5) * 15;
    const humidity = Math.max(20, Math.min(85, baseHumidity + noise));

    data.push({
      sensorId: `SENSOR_${String(i).padStart(6, '0')}`,
      longitude: lng,
      latitude: lat,
      humidity: humidity,
      timestamp: new Date().toISOString()
    });
  }

  return data;
}

const mockData = generateMockSensorData(3000);

app.get('/api/sensors/all', async (req, res) => {
  try {
    if (!mongoConnected) {
      console.log('Returning mock data (MongoDB not connected)');
      return res.json({
        count: mockData.length,
        data: mockData
      });
    }

    const allSensors = await SensorData.aggregate([
      { $sort: { sensorId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$sensorId',
          latestData: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestData' } },
      {
        $project: {
          _id: 0,
          sensorId: 1,
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          humidity: 1,
          timestamp: 1
        }
      }
    ]);

    res.json({
      count: allSensors.length,
      data: allSensors
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    console.log('Returning mock data due to error');
    res.json({
      count: mockData.length,
      data: mockData
    });
  }
});

app.get('/api/sensors/bounds', async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;

    const query = {};

    if (minLng && minLat && maxLng && maxLat) {
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)]
          ]
        }
      };
    }

    const sensors = await SensorData.aggregate([
      { $match: query },
      { $sort: { sensorId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$sensorId',
          latestData: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestData' } },
      {
        $project: {
          _id: 0,
          sensorId: 1,
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          humidity: 1,
          timestamp: 1
        }
      }
    ]);

    res.json({
      count: sensors.length,
      data: sensors
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

app.get('/api/sensors/stats', async (req, res) => {
  try {
    if (!mongoConnected) {
      const humidities = mockData.map(d => d.humidity);
      return res.json({
        count: mockData.length,
        avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        minHumidity: Math.min(...humidities),
        maxHumidity: Math.max(...humidities)
      });
    }

    const stats = await SensorData.aggregate([
      { $sort: { sensorId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$sensorId',
          humidity: { $first: '$humidity' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgHumidity: { $avg: '$humidity' },
          minHumidity: { $min: '$humidity' },
          maxHumidity: { $max: '$humidity' }
        }
      }
    ]);

    res.json(stats[0] || { count: 0, avgHumidity: 0, minHumidity: 0, maxHumidity: 0 });
  } catch (error) {
    console.error('Error fetching stats:', error);
    const humidities = mockData.map(d => d.humidity);
    res.json({
      count: mockData.length,
      avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities)
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
