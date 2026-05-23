const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const ECONOMIC_DATA = {
  years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  indicators: [
    {
      name: 'GDP（万亿）',
      unit: 'trillion CNY',
      values: [68.9, 74.6, 83.2, 91.9, 99.4, 101.2, 114.4, 120.5, 126.0, 128.5]
    },
    {
      name: '通胀率（%）',
      unit: '%',
      values: [1.4, 2.0, 1.6, 2.1, 2.9, 2.5, 0.9, 2.0, 0.2, 0.7]
    },
    {
      name: '就业率（%）',
      unit: '%',
      values: [56.1, 56.3, 56.5, 56.4, 56.3, 55.5, 56.0, 56.3, 56.5, 56.8]
    },
    {
      name: '财政收入（万亿）',
      unit: 'trillion CNY',
      values: [15.2, 15.9, 17.2, 18.3, 19.0, 18.0, 20.3, 20.4, 21.7, 22.5]
    },
    {
      name: '进出口总额（万亿）',
      unit: 'trillion CNY',
      values: [24.6, 24.3, 27.8, 30.5, 31.5, 32.2, 39.1, 42.1, 41.8, 43.5]
    }
  ]
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, 'public', urlPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/economic-data') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(ECONOMIC_DATA));
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
