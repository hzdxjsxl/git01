import { centroid, rmsScale, computePCA } from './icp.mjs';

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();

const cs = centroid(data.fragmentA);
const scale = rmsScale(data.fragmentA, cs);
const srcNorm = data.fragmentA.map(p => [(p[0]-cs[0])/scale, (p[1]-cs[1])/scale, (p[2]-cs[2])/scale]);

const srcPCA = computePCA(srcNorm);
const cutNormal = srcPCA.vectors[2];
const c = centroid(srcNorm);

const projections = srcNorm.map(p => (p[0]-c[0])*cutNormal[0] + (p[1]-c[1])*cutNormal[1] + (p[2]-c[2])*cutNormal[2]);
const sorted = projections.map((v, i) => ({v, i})).sort((a,b) => a.v - b.v);

const n = sorted.length;
const count = Math.floor(n * 0.25);

console.log(`Total points: ${n}, count (25%): ${count}`);
console.log(`Proj range: [${sorted[0].v.toFixed(4)}, ${sorted[n-1].v.toFixed(4)}]`);
console.log(`LOW end: [${sorted[0].v.toFixed(4)}, ${sorted[count-1].v.toFixed(4)}], range = ${(sorted[count-1].v - sorted[0].v).toFixed(4)}`);
console.log(`HIGH end: [${sorted[n-count].v.toFixed(4)}, ${sorted[n-1].v.toFixed(4)}], range = ${(sorted[n-1].v - sorted[n-count].v).toFixed(4)}`);

const lowDensity = count / (sorted[count-1].v - sorted[0].v);
const highDensity = count / (sorted[n-1].v - sorted[n-count].v);
console.log(`LOW density: ${lowDensity.toFixed(1)} pts/unit`);
console.log(`HIGH density: ${highDensity.toFixed(1)} pts/unit`);
console.log(`Which is denser? ${lowDensity > highDensity ? 'LOW' : 'HIGH'}`);

console.log(`\n--- Now checking which end is the cut plane ---`);
console.log(`LOW end projections near: ${sorted[Math.floor(count*0.5)].v.toFixed(4)}`);
console.log(`HIGH end projections near: ${sorted[n - Math.floor(count*0.5)].v.toFixed(4)}`);
console.log(`Median projection: ${sorted[Math.floor(n*0.5)].v.toFixed(4)}`);