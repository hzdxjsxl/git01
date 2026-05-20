const http = require('http');
const fs = require('fs');
const path = require('path');

function seeded(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

function generateCommunities(count) {
    const rng = seeded(42);
    const centers = [
        { x: 220, y: 180, priceMean: 140000, priceStd: 12000, spread: 90 },
        { x: 520, y: 140, priceMean: 115000, priceStd: 14000, spread: 110 },
        { x: 780, y: 320, priceMean: 95000, priceStd: 10000, spread: 120 },
        { x: 340, y: 430, priceMean: 80000, priceStd: 9000, spread: 130 },
        { x: 640, y: 560, priceMean: 65000, priceStd: 8000, spread: 140 },
        { x: 160, y: 640, priceMean: 52000, priceStd: 7000, spread: 130 },
        { x: 880, y: 640, priceMean: 45000, priceStd: 7000, spread: 150 },
        { x: 500, y: 780, priceMean: 38000, priceStd: 6000, spread: 140 },
    ];
    const W = 1000, H = 900;
    const list = [];
    for (let i = 0; i < count; i++) {
        const c = centers[Math.floor(rng() * centers.length)];
        let x, y;
        let tries = 0;
        do {
            x = c.x + (rng() * 2 - 1) * c.spread;
            y = c.y + (rng() * 2 - 1) * c.spread;
            tries++;
        } while ((x < 10 || x > W - 10 || y < 10 || y > H - 10) && tries < 20);
        const price = Math.max(
            20000,
            Math.round(c.priceMean + (rng() * 2 - 1) * c.priceStd * 2 + (rng() - 0.3) * c.priceStd)
        );
        list.push({ id: i, x, y, price });
    }
    return { width: W, height: H, communities: list };
}

const CACHE = generateCommunities(3200);

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/communities') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(CACHE));
        return;
    }
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = path.normalize(filePath).replace(/^\\+|^\/+/, '');
    const fullPath = path.join(__dirname, filePath);
    if (!fullPath.startsWith(__dirname)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(fullPath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return; }
        const ext = path.extname(fullPath).toLowerCase();
        const type = ext === '.html' ? 'text/html; charset=utf-8'
            : ext === '.js' ? 'application/javascript; charset=utf-8'
            : ext === '.css' ? 'text/css; charset=utf-8'
            : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
