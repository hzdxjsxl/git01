import { icp, applyTransform, centroid, rmsScale } from './icp.mjs';

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

const rand = seededRandom(42);
const rotX = 0.35 + rand() * 0.25;
const rotY = 0.45 + rand() * 0.25;
const rotZ = 0.25 + rand() * 0.25;
const trans = [1.6 + rand() * 0.4, -0.6 + rand() * 0.4, 0.9 + rand() * 0.4];

console.log(`Ground truth: rotX=${rotX.toFixed(4)} rotY=${rotY.toFixed(4)} rotZ=${rotZ.toFixed(4)}`);
console.log(`Ground truth trans: [${trans.map(v=>v.toFixed(4)).join(',')}]`);

function matMul3(A, B) {
  return [
    [A[0][0]*B[0][0]+A[0][1]*B[1][0]+A[0][2]*B[2][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]+A[0][2]*B[2][1], A[0][0]*B[0][2]+A[0][1]*B[1][2]+A[0][2]*B[2][2]],
    [A[1][0]*B[0][0]+A[1][1]*B[1][0]+A[1][2]*B[2][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]+A[1][2]*B[2][1], A[1][0]*B[0][2]+A[1][1]*B[1][2]+A[1][2]*B[2][2]],
    [A[2][0]*B[0][0]+A[2][1]*B[1][0]+A[2][2]*B[2][0], A[2][0]*B[0][1]+A[2][1]*B[1][1]+A[2][2]*B[2][1], A[2][0]*B[0][2]+A[2][1]*B[1][2]+A[2][2]*B[2][2]],
  ];
}
function matVec3(M, v) {
  return [M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2], M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2], M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]];
}
function rotMatX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[1,0,0],[0,c,-s],[0,s,c]];
}
function rotMatY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c,0,s],[0,1,0],[-s,0,c]];
}
function rotMatZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c,-s,0],[s,c,0],[0,0,1]];
}

const R_true = matMul3(matMul3(rotMatZ(rotZ), rotMatY(rotY)), rotMatX(rotX));
console.log(`R_true = [[${R_true[0].map(v=>v.toFixed(4)).join(',')}], [${R_true[1].map(v=>v.toFixed(4)).join(',')}], [${R_true[2].map(v=>v.toFixed(4)).join(',')}]]`);

const R_true_inv = [
  [R_true[0][0], R_true[1][0], R_true[2][0]],
  [R_true[0][1], R_true[1][1], R_true[2][1]],
  [R_true[0][2], R_true[1][2], R_true[2][2]],
];
const t_true_inv = [-matVec3(R_true_inv, trans)[0], -matVec3(R_true_inv, trans)[1], -matVec3(R_true_inv, trans)[2]];
console.log(`R_true_inv = [[${R_true_inv[0].map(v=>v.toFixed(4)).join(',')}], [${R_true_inv[1].map(v=>v.toFixed(4)).join(',')}], [${R_true_inv[2].map(v=>v.toFixed(4)).join(',')}]]`);
console.log(`t_true_inv = [${t_true_inv.map(v=>v.toFixed(4)).join(',')}]`);

const res = await fetch('http://localhost:3000/api/fragments?seed=42');
const data = await res.json();

const aligned_gt = applyTransform(data.fragmentB, R_true_inv, t_true_inv);
let nnSum = 0;
for (let i = 0; i < aligned_gt.length; i++) {
  const a = aligned_gt[i];
  let best = Infinity;
  for (let j = 0; j < data.fragmentA.length; j++) {
    const b = data.fragmentA[j];
    const d = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
    if (d < best) best = d;
  }
  nnSum += Math.sqrt(best);
}
console.log(`\nGround truth NN distance: ${(nnSum/aligned_gt.length).toFixed(5)}`);

const result = icp(data.fragmentB, data.fragmentA, {
  maxIter: 50, sampleSize: 1500, kSigma: 2.5, trimRatio: 0.65, maxDist: 1.5
});

const aligned_icp = applyTransform(data.fragmentB, result.R, result.t);
nnSum = 0;
for (let i = 0; i < aligned_icp.length; i++) {
  const a = aligned_icp[i];
  let best = Infinity;
  for (let j = 0; j < data.fragmentA.length; j++) {
    const b = data.fragmentA[j];
    const d = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
    if (d < best) best = d;
  }
  nnSum += Math.sqrt(best);
}
console.log(`ICP NN distance: ${(nnSum/aligned_icp.length).toFixed(5)}`);
console.log(`ICP R = [[${result.R[0].map(v=>v.toFixed(4)).join(',')}], [${result.R[1].map(v=>v.toFixed(4)).join(',')}], [${result.R[2].map(v=>v.toFixed(4)).join(',')}]]`);
console.log(`ICP t = [${result.t.map(v=>v.toFixed(4)).join(',')}]`);

console.log(`\nR diff (ICP - GT_inv): [[${[0,1,2].map(i=>[0,1,2].map(j=>(result.R[i][j]-R_true_inv[i][j]).toFixed(4)).join(',')).join('], [')}]]`);
console.log(`t diff (ICP - GT_inv): [${[0,1,2].map(i=>(result.t[i]-t_true_inv[i]).toFixed(4)).join(',')}]`);