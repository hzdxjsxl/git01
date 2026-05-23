'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TOTAL = 20000;
const BRANCH = 6;
const PORT = parseInt(process.env.PORT) || 3000;

function buildFlat() {
  const flat = new Array(TOTAL);
  flat[0] = { id: 0, parentId: -1, name: 'Root', level: 0 };
  let queue = [0];
  let nextId = 1;
  const levelCount = new Map();

  while (nextId < TOTAL) {
    const parent = queue.shift();
    if (parent === undefined) break;
    const parentLevel = flat[parent].level;
    let children = BRANCH;
    if (nextId + children > TOTAL) children = TOTAL - nextId;
    for (let i = 0; i < children; i++) {
      const id = nextId++;
      flat[id] = {
        id,
        parentId: parent,
        name: `L${parentLevel + 1}-${id}`,
        level: parentLevel + 1,
      };
      queue.push(id);
    }
  }
  return flat.slice(0, nextId);
}

const FLAT = buildFlat();
const DATA_JSON = JSON.stringify(FLAT);
const DATA_GZIP = zlib.gzipSync(Buffer.from(DATA_JSON, 'utf8'));
console.log(`[server] generated ${FLAT.length} nodes, payload ${(DATA_JSON.length / 1024).toFixed(1)}KB (gzip ${(DATA_GZIP.length / 1024).toFixed(1)}KB)`);

function sendJSON(res) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Encoding': 'gzip',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(DATA_GZIP);
}

function sendFile(res, file, type) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    res.end(buf);
  });
}

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/org' || url === '/api/org.json') {
    return sendJSON(res);
  }
  let file = 'index.html';
  if (url !== '/' && url !== '') file = url.replace(/^\//, '');
  const ext = path.extname(file);
  const type = MIME[ext] || 'application/octet-stream';
  sendFile(res, path.join(__dirname, file), type);
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}   / -> index.html   /api/org -> flat JSON`);
});
