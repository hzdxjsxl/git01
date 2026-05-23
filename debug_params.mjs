import { icp, applyTransform } from './icp.mjs';

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();

const configs = [
  { maxIter: 50, sampleSize: 1500, kSigma: 2.5, trimRatio: 0.3, maxDist: 0.5 },
  { maxIter: 80, sampleSize: 1500, kSigma: 2.0, trimRatio: 0.25, maxDist: 0.4 },
  { maxIter: 100, sampleSize: 2000, kSigma: 2.5, trimRatio: 0.2, maxDist: 0.3 },
  { maxIter: 100, sampleSize: 1500, kSigma: 3.0, trimRatio: 0.15, maxDist: 0.25 },
];

for (const cfg of configs) {
  const t0 = Date.now();
  const result = icp(data.fragmentB, data.fragmentA, cfg);
  const elapsed = Date.now() - t0;
  
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
  console.log(`trim=${cfg.trimRatio} maxDist=${cfg.maxDist} iter=${result.iterations.length}: NN=${nn.toFixed(5)} RMSE=${result.finalRmse.toFixed(4)} inliers=${result.iterations[result.iterations.length-1]?.inliers} time=${elapsed}ms`);
}