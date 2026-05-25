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

const cards = new Map();

function broadcast(data, exclude) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c !== exclude && c.readyState === 1) c.send(str);
  });
}

function sendTo(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.playerId = null;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (!ws.playerId && msg.playerId) {
      ws.playerId = msg.playerId;
    }

    if (msg.type === 'card-lock') {
      const { id, playerId } = msg;
      if (typeof id !== 'string') return;
      const card = cards.get(id);
      if (!card) return;

      if (card.lockedBy && card.lockedBy !== playerId) {
        sendTo(ws, { type: 'card-lock-denied', id, lockedBy: card.lockedBy });
        return;
      }

      card.lockedBy = playerId;
      sendTo(ws, { type: 'card-lock-granted', id, playerId });
      broadcast({ type: 'card-lock', id, lockedBy: playerId }, ws);

    } else if (msg.type === 'card-unlock') {
      const { id, playerId } = msg;
      if (typeof id !== 'string') return;
      const card = cards.get(id);
      if (!card) return;

      if (card.lockedBy === playerId) {
        card.lockedBy = null;
        broadcast({ type: 'card-unlock', id });
      }

    } else if (msg.type === 'card-move') {
      const { id, x, y, playerId, seq } = msg;
      if (typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') return;
      const card = cards.get(id);
      if (!card) return;

      if (card.lockedBy && card.lockedBy !== playerId) return;

      card.x = x;
      card.y = y;
      card.playerId = playerId;
      card.seq = seq || 0;

      broadcast({ type: 'card-move', id, x, y, playerId, seq: seq || 0 }, ws);

    } else if (msg.type === 'card-create') {
      const { id, x, y, text, playerId } = msg;
      if (typeof id !== 'string') return;
      if (!cards.has(id)) {
        cards.set(id, { x: x || 0, y: y || 0, text: text || '', lockedBy: null });
        broadcast({ type: 'card-create', id, x: x || 0, y: y || 0, text: text || '' });
      }

    } else if (msg.type === 'card-delete') {
      if (cards.delete(msg.id)) {
        broadcast({ type: 'card-delete', id: msg.id });
      }
    }
  });

  const cardData = {};
  for (const [id, c] of cards) {
    cardData[id] = {
      x: c.x, y: c.y, text: c.text || '',
      lockedBy: c.lockedBy || null
    };
  }
  sendTo(ws, { type: 'init', cards: cardData });
});

wss.on('close', (ws) => {
  if (!ws.playerId) return;
  for (const [id, card] of cards) {
    if (card.lockedBy === ws.playerId) {
      card.lockedBy = null;
      broadcast({ type: 'card-unlock', id });
    }
  }
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
