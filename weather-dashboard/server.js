const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const generateRainfallData = () => {
  const stations = [];
  const numStations = 120;
  
  for (let i = 0; i < numStations; i++) {
    const lat = 18 + Math.random() * 35;
    const lng = 73 + Math.random() * 62;
    
    let rainfall = 0;
    
    if (lng > 100 && lng < 125 && lat > 20 && lat < 40) {
      rainfall = Math.random() * 150;
    } else if (lng > 90 && lng < 110 && lat > 25 && lat < 35) {
      rainfall = Math.random() * 80 + 20;
    } else {
      rainfall = Math.random() * 30;
    }
    
    stations.push({
      id: i + 1,
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      rainfall: parseFloat(rainfall.toFixed(2)),
      name: `监测站${i + 1}`
    });
  }
  
  return stations;
};

app.get('/api/rainfall', (req, res) => {
  const data = generateRainfallData();
  res.json(data);
});

app.get('/api/contours', (req, res) => {
  const stations = generateRainfallData();
  
  const gridWidth = 100;
  const gridHeight = 80;
  const minLng = 73;
  const maxLng = 135;
  const minLat = 18;
  const maxLat = 53;
  
  const grid = [];
  for (let y = 0; y < gridHeight; y++) {
    const row = [];
    for (let x = 0; x < gridWidth; x++) {
      const lng = minLng + (x / (gridWidth - 1)) * (maxLng - minLng);
      const lat = maxLat - (y / (gridHeight - 1)) * (maxLat - minLat);
      
      let value = 0;
      let totalWeight = 0;
      
      for (const station of stations) {
        const dx = station.lng - lng;
        const dy = station.lat - lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 3) {
          const weight = 1 / (dist * dist + 0.1);
          value += station.rainfall * weight;
          totalWeight += weight;
        }
      }
      
      if (totalWeight > 0) {
        value = value / totalWeight;
      } else {
        value = 0;
      }
      
      row.push(parseFloat(value.toFixed(2)));
    }
    grid.push(row);
  }
  
  res.json({ grid, minLng, maxLng, minLat, maxLat });
});

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});