const WebSocket = require('ws');
const http = require('http');

const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 68;
const NUM_PLAYERS = 22;

const players = [];
for (let i = 0; i < NUM_PLAYERS; i++) {
  const team = i < 11 ? 0 : 1;
  players.push({
    id: i,
    x: team === 0 ? 20 + Math.random() * 15 : 65 + Math.random() * 15,
    y: 5 + Math.random() * (PITCH_HEIGHT - 10),
    team,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2
  });
}

function updatePlayers() {
  for (const p of players) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 2 || p.x > PITCH_WIDTH - 2) {
      p.vx *= -1;
      p.x = Math.max(2, Math.min(PITCH_WIDTH - 2, p.x));
    }
    if (p.y < 2 || p.y > PITCH_HEIGHT - 2) {
      p.vy *= -1;
      p.y = Math.max(2, Math.min(PITCH_HEIGHT - 2, p.y));
    }

    p.vx += (Math.random() - 0.5) * 0.5;
    p.vy += (Math.random() - 0.5) * 0.5;

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 3) {
      p.vx = (p.vx / speed) * 3;
      p.vy = (p.vy / speed) * 3;
    }

    if (p.team === 0 && p.x > 55) p.vx -= 0.2;
    if (p.team === 1 && p.x < 45) p.vx += 0.2;
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Football Heatmap Mock Server\n');
});

const wss = new WebSocket.Server({ server });

console.log('[Mock Server] 正在启动...');

wss.on('connection', (ws) => {
  console.log('[Mock Server] 新的 WebSocket 连接已建立');

  const interval = setInterval(() => {
    updatePlayers();

    const data = players.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      team: p.team,
      time: Date.now()
    }));

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, 1000);

  ws.on('close', () => {
    console.log('[Mock Server] WebSocket 连接已关闭');
    clearInterval(interval);
  });

  ws.on('error', (err) => {
    console.error('[Mock Server] WebSocket 错误:', err.message);
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`[Mock Server] 已启动，监听端口 ${PORT}`);
  console.log(`[Mock Server] WebSocket 地址: ws://localhost:${PORT}/ws`);
  console.log(`[Mock Server] 每秒推送 ${NUM_PLAYERS} 个球员坐标`);
});
