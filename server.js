const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(content);
  });
});

const wss = new WebSocketServer({ server });

let cards = new Map();

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.send(JSON.stringify({ type: 'init', cards: Object.fromEntries(cards) }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (msg.type === 'card-move') {
      const { id, x, y, playerId, seq } = msg;
      if (typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') return;
      cards.set(id, { x, y, playerId, seq: seq || 0 });

      const broadcast = JSON.stringify({
        type: 'card-move',
        id, x, y, playerId, seq: seq || 0
      });
      wss.clients.forEach((c) => {
        if (c !== ws && c.readyState === 1) c.send(broadcast);
      });
    } else if (msg.type === 'card-create') {
      const { id, x, y, text } = msg;
      if (typeof id !== 'string') return;
      if (!cards.has(id)) {
        cards.set(id, { x: x || 0, y: y || 0, text: text || '' });
        wss.clients.forEach((c) => {
          if (c.readyState === 1) {
            c.send(JSON.stringify({ type: 'card-create', id, x, y, text }));
          }
        });
      }
    } else if (msg.type === 'card-delete') {
      if (cards.delete(msg.id)) {
        wss.clients.forEach((c) => {
          if (c.readyState === 1) {
            c.send(JSON.stringify({ type: 'card-delete', id: msg.id }));
          }
        });
      }
    }
  });
});

setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false;
    c.ping();
  });
}, 30000);

server.listen(PORT, () => {
  console.log(`Clue Wall server running at http://localhost:${PORT}`);
});
