import { icp, applyTransform, computePCA, getEndBoundaryPoints } from './icp.mjs';

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

function computeNN(transformed, target, nSamples = 300) {
  let total = 0;
  const step = Math.max(1, Math.floor(transformed.length / nSamples));
  let count = 0;
  for (let i = 0; i < transformed.length && count < nSamples; i += step) {
    const p = transformed[i];
    let best = Infinity;
    for (let j = 0; j < target.length; j++) {
      const q = target[j];
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < best) best = d2;
    }
    total += Math.sqrt(best);
    count++;
  }
  return total / count;
}

const { A, B } = generateFragments(42);

const srcPCA = computePCA(A);
const tgtPCA = computePCA(B);
const srcC = srcPCA.centroid, tgtC = tgtPCA.centroid;
const srcScale = Math.sqrt(srcPCA.values.reduce((a,b)=>a+b,0));
const tgtScale = Math.sqrt(tgtPCA.values.reduce((a,b)=>a+b,0));
const scale = Math.max(srcScale, tgtScale);

const srcNorm = A.map(p => [(p[0]-srcC[0])/scale, (p[1]-srcC[1])/scale, (p[2]-srcC[2])/scale]);
const tgtNorm = B.map(p => [(p[0]-tgtC[0])/scale, (p[1]-tgtC[1])/scale, (p[2]-tgtC[2])/scale]);

const srcCutNorm = srcPCA.vectors[2];
const tgtCutNorm = tgtPCA.vectors[2];

const srcBnd = getEndBoundaryPoints(srcNorm, srcCutNorm, 0.25, false);
const tgtBnd = getEndBoundaryPoints(tgtNorm, tgtCutNorm, 0.25, false);

console.log('Source boundary:', srcBnd.length, 'points');
console.log('Target boundary:', tgtBnd.length, 'points');

const nnBefore = computeNN(srcBnd, tgtBnd, 200);
console.log('Boundary NN before alignment:', nnBefore.toFixed(5));

console.log('\n=== Running ICP with boundary-only matching ===');
const result = icp(A, B, {
  maxIter: 50,
  tol: 1e-5,
  trimRatio: 0.3,
  maxDist: 0.3,
  usePCAInit: true
});

console.log('RMSE:', result.finalRmse.toFixed(4));
const transformed = applyTransform(A, result.R, result.t);
const nn = computeNN(transformed, B);
console.log('Overall NN distance:', nn.toFixed(5));
console.log('Target: close to ground truth ~0.62');

const nnBnd = computeNN(
  getEndBoundaryPoints(transformed, tgtCutNorm, 0.25, false),
  getEndBoundaryPoints(B, tgtCutNorm, 0.25, false)
);
console.log('Boundary NN after ICP:', nnBnd.toFixed(5));
