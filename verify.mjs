import { icp, applyTransform, centroid } from './icp.mjs';

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();
console.log(`Got A=${data.fragmentA.length} B=${data.fragmentB.length} points`);

const configs = [
  { maxIter: 50, sampleSize: 1500, kSigma: 2.5, trimRatio: 0.65, maxDist: 1.5 },
  { maxIter: 50, sampleSize: 1500, kSigma: 2.0, trimRatio: 0.5, maxDist: 1.0 },
  { maxIter: 80, sampleSize: 2000, kSigma: 2.5, trimRatio: 0.5, maxDist: 1.0 },
  { maxIter: 100, sampleSize: 1500, kSigma: 2.0, trimRatio: 0.4, maxDist: 0.8 },
];

for (const cfg of configs) {
  console.log(`\n--- Testing: maxIter=${cfg.maxIter}, sampleSize=${cfg.sampleSize}, kSigma=${cfg.kSigma}, trimRatio=${cfg.trimRatio}, maxDist=${cfg.maxDist} ---`);
  const t0 = performance.now();
  const result = icp(data.fragmentB, data.fragmentA, cfg);
  const dt = performance.now() - t0;
  console.log(`ICP: ${result.iterations.length} iters in ${dt.toFixed(0)} ms, final RMSE=${result.finalRmse.toFixed(6)}`);
  
  const aligned = applyTransform(data.fragmentB, result.R, result.t);
  let nnSum = 0;
  for (let i = 0; i < aligned.length; i++) {
    const a = aligned[i];
    let best = Infinity;
    for (let j = 0; j < data.fragmentA.length; j++) {
      const b = data.fragmentA[j];
      const d = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
      if (d < best) best = d;
    }
    nnSum += Math.sqrt(best);
  }
  const nn = nnSum / aligned.length;
  console.log(`NN distance: ${nn.toFixed(5)}`);
  console.log(`R = [[${result.R[0].map(v=>v.toFixed(4)).join(',')}], [${result.R[1].map(v=>v.toFixed(4)).join(',')}], [${result.R[2].map(v=>v.toFixed(4)).join(',')}]]`);
  console.log(`t = [${result.t.map(v=>v.toFixed(4)).join(',')}]`);
  
  if (nn < 0.15) {
    console.log('✅ GOOD');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT');
  }
}