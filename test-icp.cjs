const { icp, applyTransform } = require('./public/icp.js');

function rotate(p, ax, ay, az) {
  const cx = Math.cos(ax), sx = Math.sin(ax);
  const cy = Math.cos(ay), sy = Math.sin(ay);
  const cz = Math.cos(az), sz = Math.sin(az);
  let [x, y, z] = p;
  let y1 = y * cx - z * sx, z1 = y * sx + z * cx;
  let x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
  let x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;
  return [x3, y3, z2];
}

const target = [];
for (let i = 0; i < 3000; i++) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);
  if (x > 0) target.push([x, y, z]);
}

const sourceOriginal = target.map(p => p.slice());
const R_true = [0.35, 0.45, 0.25];
const T_true = [1.6, -0.6, 0.9];
const source = sourceOriginal.map(p => {
  const r = rotate(p, R_true[0], R_true[1], R_true[2]);
  return [r[0] + T_true[0], r[1] + T_true[1], r[2] + T_true[2]];
});

console.log(`Source pts: ${source.length}, Target pts: ${target.length}`);
const t0 = performance.now();
const result = icp(source, target, { maxIter: 30, sampleSize: 500, kSigma: 2.0 });
const dt = performance.now() - t0;
console.log(`ICP took ${dt.toFixed(2)}ms, ${result.iterations.length} iterations, final RMSE=${result.finalRmse.toFixed(5)}`);

const aligned = applyTransform(source, result.R, result.t);
let errSum = 0;
for (let i = 0; i < source.length; i++) {
  const a = aligned[i], b = target[i];
  errSum += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
}
console.log(`Mean point error to original target: ${(errSum/source.length).toFixed(5)}`);
console.log('R=', result.R);
console.log('t=', result.t);
