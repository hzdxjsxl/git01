import { icp, applyTransform } from './icp.mjs';

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();
console.log(`Got A=${data.fragmentA.length} B=${data.fragmentB.length} points`);

const t0 = performance.now();
const result = icp(data.fragmentB, data.fragmentA, { maxIter: 20, sampleSize: 800, kSigma: 2.0 });
const dt = performance.now() - t0;
console.log(`ICP: ${result.iterations.length} iters in ${dt.toFixed(0)} ms, final RMSE=${result.finalRmse.toFixed(5)}`);
console.log('Sample iter trace:');
result.iterations.slice(0, 5).forEach(it => console.log(`  iter ${it.iter}: RMSE=${it.rmse.toFixed(5)}  inliers=${it.inliers}  time=${it.timeMs}ms`));

const aligned = applyTransform(data.fragmentB, result.R, result.t);
let nn = 0;
for (let i = 0; i < aligned.length; i++) {
  const a = aligned[i];
  let best = Infinity;
  for (let j = 0; j < data.fragmentA.length; j++) {
    const b = data.fragmentA[j];
    const d = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
    if (d < best) best = d;
  }
  nn += Math.sqrt(best);
}
console.log(`Post-ICP mean nearest-neighbor distance: ${(nn/aligned.length).toFixed(5)}`);
console.log('TEST_OK');
