import { jacobiEigen3x3 } from './icp.mjs';

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateFragments(seed) {
  const rng = mulberry32(seed);
  const N = 20000;
  const R = 1.0;
  const noise = 0.02;
  const allPoints = [];
  for (let i = 0; i < N; i++) {
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = R * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.sin(phi) * Math.sin(theta);
    const z = R * Math.cos(phi);
    allPoints.push([x, y, z]);
  }
  const fragA = [], fragB = [];
  for (const p of allPoints) {
    const nx = p[0] + (rng() - 0.5) * 2 * noise;
    const ny = p[1] + (rng() - 0.5) * 2 * noise;
    const nz = p[2] + (rng() - 0.5) * 2 * noise;
    if (p[0] < 0) fragA.push([nx, ny, nz]);
    else fragB.push([nx, ny, nz]);
  }
  return { A: fragA, B: fragB };
}

function computeCov(points) {
  const n = points.length;
  let cx = 0, cy = 0, cz = 0;
  for (const p of points) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= n; cy /= n; cz /= n;
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  for (const p of points) {
    const dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
    C[0][0] += dx*dx; C[0][1] += dx*dy; C[0][2] += dx*dz;
    C[1][0] += dy*dx; C[1][1] += dy*dy; C[1][2] += dy*dz;
    C[2][0] += dz*dx; C[2][1] += dz*dy; C[2][2] += dz*dz;
  }
  return { C, centroid: [cx, cy, cz] };
}

const { B } = generateFragments(42);
const { C, centroid } = computeCov(B);

console.log('Target centroid:', centroid.map(v => v.toFixed(4)));
console.log('Covariance matrix:');
for (const row of C) console.log('  ' + row.map(v => v.toFixed(2)).join(', '));

const trace = C[0][0] + C[1][1] + C[2][2];
console.log('Trace:', trace.toFixed(2));

const { values, vectors } = jacobiEigen3x3(C);
console.log('Eigenvalues:', values.map(v => v.toFixed(4)));
console.log('Sum of eigenvalues:', values.reduce((a,b)=>a+b,0).toFixed(4));
console.log('Eigenvectors:');
for (const v of vectors) console.log('  ' + v.map(x => x.toFixed(4)).join(', '));

let minEig = Math.min(...values);
if (minEig < 0) console.log('ERROR: Negative eigenvalue!', minEig.toFixed(4));

console.log('\nCheck orthogonality of eigenvectors:');
for (let i = 0; i < 3; i++) {
  for (let j = i+1; j < 3; j++) {
    const dot = vectors[i][0]*vectors[j][0] + vectors[i][1]*vectors[j][1] + vectors[i][2]*vectors[j][2];
    console.log('  v' + i + ' . v' + j + ' =', dot.toFixed(10));
  }
}

console.log('\nCheck reconstruction: A = V * diag(ev) * V^T');
const recon = [[0,0,0],[0,0,0],[0,0,0]];
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    for (let k = 0; k < 3; k++) {
      recon[i][j] += vectors[k][i] * values[k] * vectors[k][j];
    }
  }
}
console.log('Reconstructed matrix:');
for (const row of recon) console.log('  ' + row.map(v => v.toFixed(2)).join(', '));
console.log('Original - Reconstructed:');
for (let i = 0; i < 3; i++) {
  const diff = [];
  for (let j = 0; j < 3; j++) diff.push((C[i][j] - recon[i][j]).toFixed(4));
  console.log('  ' + diff.join(', '));
}
