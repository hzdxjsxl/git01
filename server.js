const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3000;
const STRESS_INTERVAL = parseInt(process.env.STRESS_INTERVAL || '50', 10);

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
  } else if (req.url === '/stress') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'stress', interval: STRESS_INTERVAL }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server });

let stressMode = false;

wss.on('connection', (ws, req) => {
  const snapshot = JSON.parse(JSON.stringify(totals));
  ws.send(JSON.stringify({ type: 'snapshot', totals: snapshot, districts: DISTRICTS, stations, stressMode }));

  const clientStress = req.url && req.url.includes('stress=true');
  let intervalMs = clientStress || stressMode ? STRESS_INTERVAL : 1000;

  let timer = null;

  function startTimer(ms) {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
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
    }, ms);
  }

  startTimer(intervalMs);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'stress') {
        stressMode = msg.enabled;
        intervalMs = stressMode ? (msg.interval || STRESS_INTERVAL) : 1000;
        startTimer(intervalMs);
        ws.send(JSON.stringify({ type: 'stress_ack', enabled: stressMode, interval: intervalMs }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    if (timer) clearInterval(timer);
  });

  ws.on('error', () => {
    if (timer) clearInterval(timer);
  });
});

server.listen(PORT, () => {
  console.log(`Election dashboard running at http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`Stress test interval: ${STRESS_INTERVAL}ms (set via STRESS_INTERVAL env)`);
});
