import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = 8081;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server is running');
});

const wss = new WebSocketServer({ server });

function generateVehicles(count = 50) {
  const vehicles = [];
  for (let i = 0; i < count; i++) {
    vehicles.push({
      id: i,
      x: Math.random() * 1200,
      y: Math.random() * 700,
      speed: Math.random() * 3 + 1,
      heading: Math.random() * 360
    });
  }
  return vehicles;
}

function updateVehicles(vehicles) {
  for (const v of vehicles) {
    const headingRad = (v.heading * Math.PI) / 180;
    v.x += v.speed * 2 * 0.05;
    v.y += v.speed * 2 * 0.05;

    if (Math.random() < 0.02) {
      v.heading += (Math.random() - 0.5) * 30;
    }

    if (v.x < 0) v.x = 1200;
    else if (v.x > 1200) v.x = 0;
    if (v.y < 0) v.y = 700;
    else if (v.y > 700) v.y = 0;
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const vehicles = generateVehicles(50);
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New client connected. Total:', wss.clients.size);
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected. Total:', wss.clients.size);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

setInterval(() => {
  updateVehicles(vehicles);
  const shuffled = shuffleArray(vehicles);
  const data = JSON.stringify(shuffled);

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}, 50);

server.listen(PORT, () => {
  console.log(`WebSocket server starting on :${PORT}`);
});
