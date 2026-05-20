const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GRID_SIZE = 20;
const SHELF_COUNT = 100;
const ROBOT_COUNT = 2;

function generateWarehouseData() {
  const shelves = [];
  const occupiedPositions = new Set();

  for (let i = 0; i < SHELF_COUNT; i++) {
    let x, z, key;
    do {
      x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      z = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      key = `${x},${z}`;
    } while (occupiedPositions.has(key));
    
    occupiedPositions.add(key);
    shelves.push({
      id: `shelf-${i}`,
      x: x,
      z: z,
      width: 1.8,
      height: 3 + Math.random() * 2,
      depth: 1.8,
      color: `hsl(${Math.floor(Math.random() * 60) + 180}, 50%, 40%)`
    });
  }

  const robots = [];
  const robotPositions = [
    { x: 1, z: 1 },
    { x: GRID_SIZE - 2, z: GRID_SIZE - 2 }
  ];

  for (let i = 0; i < ROBOT_COUNT; i++) {
    robots.push({
      id: `robot-${i}`,
      x: robotPositions[i].x,
      z: robotPositions[i].z,
      color: i === 0 ? '#ff4444' : '#44ff44'
    });
  }

  return {
    gridSize: GRID_SIZE,
    shelves,
    robots
  };
}

app.get('/api/warehouse', (req, res) => {
  const data = generateWarehouseData();
  res.json(data);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Warehouse server is running' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Warehouse 3D Server is running!`);
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`📊 API Endpoint: http://localhost:${PORT}/api/warehouse`);
  console.log(`========================================\n`);
});
