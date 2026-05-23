const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}
function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}
function rotateZ(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}
function translate(p, t) {
  return [p[0] + t[0], p[1] + t[1], p[2] + t[2]];
}

app.get('/api/fragments', (req, res) => {
  const seed = parseInt(req.query.seed || '42', 10);
  const rand = seededRandom(seed);

  const TOTAL = 20000;
  const R = 1.0;
  const fragA = [];
  const fragB = [];

  for (let i = 0; i < TOTAL; i++) {
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = R * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.sin(phi) * Math.sin(theta);
    const z = R * Math.cos(phi);
    const noise = 0.005;
    const nx = x + (rand() - 0.5) * noise;
    const ny = y + (rand() - 0.5) * noise;
    const nz = z + (rand() - 0.5) * noise;
    if (x < 0) {
      fragA.push([nx, ny, nz]);
    } else {
      fragB.push([nx, ny, nz]);
    }
  }

  const rotX = 0.35 + rand() * 0.25;
  const rotY = 0.45 + rand() * 0.25;
  const rotZ = 0.25 + rand() * 0.25;
  const trans = [1.6 + rand() * 0.4, -0.6 + rand() * 0.4, 0.9 + rand() * 0.4];

  const transformedB = fragB.map(p => {
    let q = rotateX(p, rotX);
    q = rotateY(q, rotY);
    q = rotateZ(q, rotZ);
    q = translate(q, trans);
    return q;
  });

  const shuffled = transformedB.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  res.json({
    meta: {
      description: '打碎瓷器点云（球面切割），每个碎片包含若干三维点坐标 [x,y,z]',
      units: '归一化坐标',
      seed,
      fragmentA_count: fragA.length,
      fragmentB_count: shuffled.length,
    },
    fragmentA: fragA,
    fragmentB: shuffled,
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`考古三维拼接服务已启动: http://localhost:${PORT}`);
});
