const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3000;

const DISTRICTS = [
  { id: 'D01', name: '北城选区', party: 'A' },
  { id: 'D02', name: '东城选区', party: 'A' },
  { id: 'D03', name: '西城选区', party: 'B' },
  { id: 'D04', name: '南城选区', party: 'B' },
  { id: 'D05', name: '中心选区', party: 'A' },
  { id: 'D06', name: '湖滨选区', party: 'B' },
  { id: 'D07', name: '山景选区', party: 'A' },
  { id: 'D08', name: '海湾选区', party: 'B' },
];

const STATIONS_PER_DISTRICT = 3;

const stations = [];
DISTRICTS.forEach(d => {
  for (let i = 1; i <= STATIONS_PER_DISTRICT; i++) {
    stations.push({
      id: `${d.id}-S${i}`,
      districtId: d.id,
      districtName: d.name,
      party: d.party,
      bias: d.party === 'A' ? 0.6 : 0.4,
    });
  }
});

const totals = {};
stations.forEach(s => {
  totals[s.districtId] = totals[s.districtId] || { A: 0, B: 0 };
});

function generateIncrement(station) {
  const base = Math.floor(Math.random() * 8) + 2;
  const voteA = Math.floor(base * station.bias);
  const voteB = base - voteA;
  return { stationId: station.id, districtId: station.districtId, A: voteA, B: voteB };
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (req.url === '/districts') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ districts: DISTRICTS, stations }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const snapshot = JSON.parse(JSON.stringify(totals));
  ws.send(JSON.stringify({ type: 'snapshot', totals: snapshot, districts: DISTRICTS, stations }));

  const interval = setInterval(() => {
    const increments = [];
    stations.forEach(s => {
      const inc = generateIncrement(s);
      if (totals[s.districtId]) {
        totals[s.districtId].A += inc.A;
        totals[s.districtId].B += inc.B;
      }
      increments.push(inc);
    });

    const payload = { type: 'increment', increments, timestamp: Date.now() };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, 1000);

  ws.on('close', () => {
    clearInterval(interval);
  });

  ws.on('error', () => {
    clearInterval(interval);
  });
});

server.listen(PORT, () => {
  console.log(`Election dashboard running at http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});
