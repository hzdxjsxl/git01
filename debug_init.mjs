import { centroid, rmsScale, computePCA, getEndBoundaryPoints, applyTransform, icp } from './icp.mjs';

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();

const cs = centroid(data.fragmentA);
const ct = centroid(data.fragmentB);
const sScale = rmsScale(data.fragmentA, cs);
const tScale = rmsScale(data.fragmentB, ct);
const commonScale = sScale > tScale ? sScale : tScale;
const scale = commonScale > 1e-10 ? commonScale : 1;

const srcNorm = data.fragmentA.map(p => [(p[0]-cs[0])/scale, (p[1]-cs[1])/scale, (p[2]-cs[2])/scale]);
const tgtNorm = data.fragmentB.map(p => [(p[0]-ct[0])/scale, (p[1]-ct[1])/scale, (p[2]-ct[2])/scale]);

const srcPCA = computePCA(srcNorm);
const tgtPCA = computePCA(tgtNorm);

console.log('=== PCA analysis ===');
console.log(`Source eigenvalues: [${srcPCA.values.map(v=>v.toFixed(2)).join(', ')}]`);
console.log(`Target eigenvalues: [${tgtPCA.values.map(v=>v.toFixed(2)).join(', ')}]`);
console.log(`Source cut normal: [${srcPCA.vectors[2].map(v=>v.toFixed(4)).join(', ')}]`);
console.log(`Target cut normal: [${tgtPCA.vectors[2].map(v=>v.toFixed(4)).join(', ')}]`);

function rotationAlignVectors(a, b) {
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  if (dot > 0.9999) return [[1,0,0],[0,1,0],[0,0,1]];
  if (dot < -0.9999) {
    const perp = Math.abs(a[0]) < 0.9 ? [0,1,0] : [1,0,0];
    const px = perp[0]*a[0] + perp[1]*a[1] + perp[2]*a[2];
    const perp2 = [perp[0]-px*a[0], perp[1]-px*a[1], perp[2]-px*a[2]];
    const plen = Math.sqrt(perp2[0]**2+perp2[1]**2+perp2[2]**2);
    return rotationFromAxisAngle([perp2[0]/plen, perp2[1]/plen, perp2[2]/plen], Math.PI);
  }
  function rotationFromAxisAngle(axis, angle) {
    const c = Math.cos(angle), s = Math.sin(angle), t = 1-c;
    const x=axis[0], y=axis[1], z=axis[2];
    return [[t*x*x+c, t*x*y-s*z, t*x*z+s*y],[t*x*y+s*z, t*y*y+c, t*y*z-s*x],[t*x*z-s*y, t*y*z+s*x, t*z*z+c]];
  }
  const axis = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const alen = Math.sqrt(axis[0]**2+axis[1]**2+axis[2]**2);
  if (alen < 1e-10) return [[1,0,0],[0,1,0],[0,0,1]];
  return rotationFromAxisAngle([axis[0]/alen, axis[1]/alen, axis[2]/alen], Math.acos(dot));
}

function evalMatch(srcBnd, tgtBnd, R, t) {
  const transformed = applyTransform(srcBnd, R, t);
  let sumD2 = 0;
  const checkN = Math.min(80, transformed.length);
  for (let i = 0; i < checkN; i++) {
    const p = transformed[i];
    let minD2 = Infinity;
    for (let j = 0; j < tgtBnd.length; j++) {
      const q = tgtBnd[j];
      const d2 = (p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
      if (d2 < minD2) minD2 = d2;
    }
    sumD2 += minD2;
  }
  return Math.sqrt(sumD2 / checkN);
}

const srcCutNorm = srcPCA.vectors[2];
const tgtCutNorm = tgtPCA.vectors[2];

console.log('\n=== Testing all 4 end combinations ===');

for (const srcSign of [1, -1]) {
  const srcNormal = srcSign === 1 ? srcCutNorm : [-srcCutNorm[0], -srcCutNorm[1], -srcCutNorm[2]];
  for (const srcUseHigh of [false, true]) {
    for (const tgtUseHigh of [false, true]) {
      const R_align = rotationAlignVectors(srcNormal, tgtCutNorm);
      const t_align = [0, 0, 0];
      const srcBnd = getEndBoundaryPoints(srcNorm, srcNormal, 0.25, srcUseHigh);
      const tgtBnd = getEndBoundaryPoints(tgtNorm, tgtCutNorm, 0.25, tgtUseHigh);
      const err = evalMatch(srcBnd, tgtBnd, R_align, t_align);
      console.log(`  srcSign=${srcSign} srcHigh=${srcUseHigh} tgtHigh=${tgtUseHigh}: err=${err.toFixed(4)}`);
    }
  }
}

console.log('\n=== Running full ICP ===');
const result = icp(data.fragmentB, data.fragmentA, {
  maxIter: 50, sampleSize: 1500, kSigma: 2.5, trimRatio: 0.5, maxDist: 1.0
});

console.log(`Final RMSE: ${result.finalRmse.toFixed(4)}`);
console.log(`Iterations: ${result.iterations.length}`);
console.log(`Last 3 iterations:`);
result.iterations.slice(-3).forEach(it => console.log(`  iter ${it.iter}: rmse=${it.rmse.toFixed(4)}, inliers=${it.inliers}, medDist=${it.medDist.toFixed(4)}`));