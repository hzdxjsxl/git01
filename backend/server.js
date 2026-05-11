const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const TOTAL_CASES = 500000;

function generateRandomCases(count) {
  const cases = [];
  const chinaBounds = {
    minLng: 73.5,
    maxLng: 135.0,
    minLat: 18.0,
    maxLat: 53.5
  };
  
  const hotspots = [
    { lng: 116.4, lat: 39.9, weight: 15 },
    { lng: 121.4, lat: 31.2, weight: 18 },
    { lng: 113.2, lat: 23.1, weight: 14 },
    { lng: 104.0, lat: 30.6, weight: 12 },
    { lng: 118.7, lat: 32.0, weight: 10 },
    { lng: 117.2, lat: 31.8, weight: 8 },
    { lng: 120.1, lat: 30.2, weight: 11 },
    { lng: 106.5, lat: 29.5, weight: 9 },
    { lng: 108.9, lat: 34.3, weight: 7 },
    { lng: 112.9, lat: 28.2, weight: 8 }
  ];
  
  const totalWeight = hotspots.reduce((sum, h) => sum + h.weight, 0);
  
  for (let i = 0; i < count; i++) {
    let lng, lat;
    const hotspotSelector = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedHotspot = null;
    
    for (const hotspot of hotspots) {
      cumulative += hotspot.weight;
      if (hotspotSelector <= cumulative) {
        selectedHotspot = hotspot;
        break;
      }
    }
    
    if (selectedHotspot && Math.random() < 0.6) {
      const spread = 1.5;
      lng = selectedHotspot.lng + (Math.random() - 0.5) * spread;
      lat = selectedHotspot.lat + (Math.random() - 0.5) * spread;
    } else {
      lng = chinaBounds.minLng + Math.random() * (chinaBounds.maxLng - chinaBounds.minLng);
      lat = chinaBounds.minLat + Math.random() * (chinaBounds.maxLat - chinaBounds.minLat);
    }
    
    lng = Math.max(chinaBounds.minLng, Math.min(chinaBounds.maxLng, lng));
    lat = Math.max(chinaBounds.minLat, Math.min(chinaBounds.maxLat, lat));
    
    const days = Math.floor(Math.random() * 180);
    
    cases.push([Number(lng.toFixed(6)), Number(lat.toFixed(6)), days]);
  }
  
  return cases;
}

console.log('Generating case data...');
const cachedCases = generateRandomCases(TOTAL_CASES);
console.log(`Generated ${cachedCases.length} cases`);

app.get('/api/cases', (req, res) => {
  res.json(cachedCases);
});

app.get('/api/stats', (req, res) => {
  res.json({
    total: cachedCases.length,
    generatedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`GET /api/cases - Returns ${cachedCases.length} raw cases as [lng, lat, days]`);
  console.log(`GET /api/stats - Returns stats`);
});
