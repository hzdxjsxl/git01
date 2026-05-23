import { centroid, rmsScale, computePCA, findBoundaryPoints, applyTransform } from './icp.mjs';

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

console.log(`src PCA eigenvalues: [${srcPCA.values.map(v=>v.toFixed(4)).join(', ')}]`);
console.log(`tgt PCA eigenvalues: [${tgtPCA.values.map(v=>v.toFixed(4)).join(', ')}]`);

const srcCutNormal = srcPCA.vectors[2];
const tgtCutNormal = tgtPCA.vectors[2];
console.log(`src cut normal: [${srcCutNormal.map(v=>v.toFixed(4)).join(', ')}]`);
console.log(`tgt cut normal: [${tgtCutNormal.map(v=>v.toFixed(4)).join(', ')}]`);

const srcBnd = findBoundaryPoints(srcNorm, srcCutNormal, 0.25);
const tgtBnd = findBoundaryPoints(tgtNorm, tgtCutNormal, 0.25);
console.log(`\nSource boundary points: ${srcBnd.length} (out of ${srcNorm.length})`);
console.log(`Target boundary points: ${tgtBnd.length} (out of ${tgtNorm.length})`);

const srcBndCentroid = centroid(srcBnd);
const tgtBndCentroid = centroid(tgtBnd);
console.log(`Source boundary centroid: [${srcBndCentroid.map(v=>v.toFixed(4)).join(', ')}]`);
console.log(`Target boundary centroid: [${tgtBndCentroid.map(v=>v.toFixed(4)).join(', ')}]`);

let srcProjMin = Infinity, srcProjMax = -Infinity;
for (const p of srcNorm) {
  const proj = p[0]*srcCutNormal[0] + p[1]*srcCutNormal[1] + p[2]*srcCutNormal[2];
  if (proj < srcProjMin) srcProjMin = proj;
  if (proj > srcProjMax) srcProjMax = proj;
}
let tgtProjMin = Infinity, tgtProjMax = -Infinity;
for (const p of tgtNorm) {
  const proj = p[0]*tgtCutNormal[0] + p[1]*tgtCutNormal[1] + p[2]*tgtCutNormal[2];
  if (proj < tgtProjMin) tgtProjMin = proj;
  if (proj > tgtProjMax) tgtProjMax = proj;
}
console.log(`Source projection range: [${srcProjMin.toFixed(4)}, ${srcProjMax.toFixed(4)}]`);
console.log(`Target projection range: [${tgtProjMin.toFixed(4)}, ${tgtProjMax.toFixed(4)}]`);

const srcBndProj = srcBnd.map(p => p[0]*srcCutNormal[0]+p[1]*srcCutNormal[1]+p[2]*srcCutNormal[2]);
const tgtBndProj = tgtBnd.map(p => p[0]*tgtCutNormal[0]+p[1]*tgtCutNormal[1]+p[2]*tgtCutNormal[2]);
console.log(`Source boundary proj range: [${Math.min(...srcBndProj).toFixed(4)}, ${Math.max(...srcBndProj).toFixed(4)}]`);
console.log(`Target boundary proj range: [${Math.min(...tgtBndProj).toFixed(4)}, ${Math.max(...tgtBndProj).toFixed(4)}]`);