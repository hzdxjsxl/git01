import { centroid, rmsScale, computePCA, getEndBoundaryPoints, applyTransform, svd3x3, det3x3, orthogonalizeRotation, median } from './icp.mjs';

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

function bestRigidTransform(src, dst) {
  const n = src.length;
  const cs = centroid(src);
  const cd = centroid(dst);
  const srcC = src.map(p => [p[0]-cs[0], p[1]-cs[1], p[2]-cs[2]]);
  const dstC = dst.map(p => [p[0]-cd[0], p[1]-cd[1], p[2]-cd[2]]);
  const H = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < n; i++) {
    H[0][0] += srcC[i][0]*dstC[i][0]; H[0][1] += srcC[i][0]*dstC[i][1]; H[0][2] += srcC[i][0]*dstC[i][2];
    H[1][0] += srcC[i][1]*dstC[i][0]; H[1][1] += srcC[i][1]*dstC[i][1]; H[1][2] += srcC[i][1]*dstC[i][2];
    H[2][0] += srcC[i][2]*dstC[i][0]; H[2][1] += srcC[i][2]*dstC[i][1]; H[2][2] += srcC[i][2]*dstC[i][2];
  }
  const { U, V } = svd3x3(H);
  let R = [
    [V[0][0]*U[0][0] + V[0][1]*U[0][1] + V[0][2]*U[0][2], V[0][0]*U[1][0] + V[0][1]*U[1][1] + V[0][2]*U[1][2], V[0][0]*U[2][0] + V[0][1]*U[2][1] + V[0][2]*U[2][2]],
    [V[1][0]*U[0][0] + V[1][1]*U[0][1] + V[1][2]*U[0][2], V[1][0]*U[1][0] + V[1][1]*U[1][1] + V[1][2]*U[1][2], V[1][0]*U[2][0] + V[1][1]*U[2][1] + V[1][2]*U[2][2]],
    [V[2][0]*U[0][0] + V[2][1]*U[0][1] + V[2][2]*U[0][2], V[2][0]*U[1][0] + V[2][1]*U[1][1] + V[2][2]*U[1][2], V[2][0]*U[2][0] + V[2][1]*U[2][1] + V[2][2]*U[2][2]],
  ];
  if (det3x3(R) < 0) {
    R[0][2] = -R[0][2]; R[1][2] = -R[1][2]; R[2][2] = -R[2][2];
  }
  const t = [cd[0] - (R[0][0]*cs[0]+R[0][1]*cs[1]+R[0][2]*cs[2]), cd[1] - (R[1][0]*cs[0]+R[1][1]*cs[1]+R[1][2]*cs[2]), cd[2] - (R[2][0]*cs[0]+R[2][1]*cs[1]+R[2][2]*cs[2])];
  return { R, t };
}

function composeTransform(R2, t2, R1, t1) {
  const R = [
    [R2[0][0]*R1[0][0]+R2[0][1]*R1[1][0]+R2[0][2]*R1[2][0], R2[0][0]*R1[0][1]+R2[0][1]*R1[1][1]+R2[0][2]*R1[2][1], R2[0][0]*R1[0][2]+R2[0][1]*R1[1][2]+R2[0][2]*R1[2][2]],
    [R2[1][0]*R1[0][0]+R2[1][1]*R1[1][0]+R2[1][2]*R1[2][0], R2[1][0]*R1[0][1]+R2[1][1]*R1[1][1]+R2[1][2]*R1[2][1], R2[1][0]*R1[0][2]+R2[1][1]*R1[1][2]+R2[1][2]*R1[2][2]],
    [R2[2][0]*R1[0][0]+R2[2][1]*R1[1][0]+R2[2][2]*R1[2][0], R2[2][0]*R1[0][1]+R2[2][1]*R1[1][1]+R2[2][2]*R1[2][1], R2[2][0]*R1[0][2]+R2[2][1]*R1[1][2]+R2[2][2]*R1[2][2]],
  ];
  const t = [
    t2[0] + R2[0][0]*t1[0] + R2[0][1]*t1[1] + R2[0][2]*t1[2],
    t2[1] + R2[1][0]*t1[0] + R2[1][1]*t1[1] + R2[1][2]*t1[2],
    t2[2] + R2[2][0]*t1[0] + R2[2][1]*t1[1] + R2[2][2]*t1[2],
  ];
  return { R, t };
}

const srcCutNorm = srcPCA.vectors[2];
const tgtCutNorm = tgtPCA.vectors[2];

console.log('=== Trying boundary-only ICP with multi-end init ===');

let bestOverall = null;
let bestNN = Infinity;

for (const srcSign of [1, -1]) {
  const srcNormal = srcSign === 1 ? srcCutNorm : [-srcCutNorm[0], -srcCutNorm[1], -srcCutNorm[2]];
  for (const srcUseHigh of [false, true]) {
    for (const tgtUseHigh of [false, true]) {
      const R_align = rotationAlignVectors(srcNormal, tgtCutNorm);
      const srcC = srcPCA.centroid;
      const tgtC = tgtPCA.centroid;
      const t_align = [
        tgtC[0] - (R_align[0][0]*srcC[0]+R_align[0][1]*srcC[1]+R_align[0][2]*srcC[2]),
        tgtC[1] - (R_align[1][0]*srcC[0]+R_align[1][1]*srcC[1]+R_align[1][2]*srcC[2]),
        tgtC[2] - (R_align[2][0]*srcC[0]+R_align[2][1]*srcC[1]+R_align[2][2]*srcC[2]),
      ];

      const srcBndAll = getEndBoundaryPoints(srcNorm, srcNormal, 0.25, srcUseHigh);
      const tgtBndAll = getEndBoundaryPoints(tgtNorm, tgtCutNorm, 0.25, tgtUseHigh);

      const subN = Math.min(500, srcBndAll.length, tgtBndAll.length);
      const srcBnd = srcBndAll.slice(0, subN);
      const tgtBnd = tgtBndAll.slice(0, subN);

      let accR = R_align;
      let accT = t_align;
      let curPts = applyTransform(srcBnd, accR, accT);

      for (let iter = 0; iter < 30; iter++) {
        const corr = [];
        const dists = [];
        for (let i = 0; i < curPts.length; i++) {
          const p = curPts[i];
          let bestJ = 0, bestD2 = Infinity;
          for (let j = 0; j < tgtBnd.length; j++) {
            const q = tgtBnd[j];
            const d2 = (p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
            if (d2 < bestD2) { bestD2 = d2; bestJ = j; }
          }
          corr.push(bestJ);
          dists.push(Math.sqrt(bestD2));
        }

        const sorted = dists.map((d,i)=>({d,i})).sort((a,b)=>a.d-b.d);
        const trimCount = Math.max(10, Math.floor(curPts.length * 0.7));
        const trimmed = sorted.slice(0, trimCount);

        const srcIn = [], dstIn = [];
        for (const item of trimmed) {
          if (item.d < 0.5) {
            srcIn.push(curPts[item.i]);
            dstIn.push(tgtBnd[corr[item.i]]);
          }
        }

        if (srcIn.length < 6) break;

        const { R, t } = bestRigidTransform(srcIn, dstIn);
        if (det3x3(R) < 0.5) continue;

        curPts = applyTransform(curPts, R, t);
        const comp = composeTransform(R, t, accR, accT);
        accR = comp.R;
        accT = comp.t;

        if (Math.abs(det3x3(accR) - 1) > 0.1) {
          const newR = orthogonalizeRotation(accR);
          if (det3x3(newR) > 0.5) accR = newR;
        }
      }

      const transformed = applyTransform(srcBnd, accR, accT);
      let nnSum = 0;
      for (let i = 0; i < transformed.length; i++) {
        const p = transformed[i];
        let bestD = Infinity;
        for (let j = 0; j < tgtBnd.length; j++) {
          const q = tgtBnd[j];
          const d = Math.sqrt((p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2);
          if (d < bestD) bestD = d;
        }
        nnSum += bestD;
      }
      const nn = nnSum / transformed.length;

      if (nn < bestNN) {
        bestNN = nn;
        const fullR = [
          [accR[0][0], accR[0][1], accR[0][2]],
          [accR[1][0], accR[1][1], accR[1][2]],
          [accR[2][0], accR[2][1], accR[2][2]],
        ];
        const fullT = [
          ct[0] + scale * accT[0] - (fullR[0][0]*cs[0]+fullR[0][1]*cs[1]+fullR[0][2]*cs[2]),
          ct[1] + scale * accT[1] - (fullR[1][0]*cs[0]+fullR[1][1]*cs[1]+fullR[1][2]*cs[2]),
          ct[2] + scale * accT[2] - (fullR[2][0]*cs[0]+fullR[2][1]*cs[1]+fullR[2][2]*cs[2]),
        ];
        bestOverall = { R: fullR, t: fullT };
      }

      console.log(`  srcSign=${srcSign} srcHigh=${srcUseHigh} tgtHigh=${tgtUseHigh}: boundary NN=${nn.toFixed(4)}`);
    }
  }
}

console.log(`\nBest boundary NN: ${bestNN.toFixed(4)}`);

const aligned = applyTransform(data.fragmentB, bestOverall.R, bestOverall.t);
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
console.log(`Overall NN distance: ${(nnSum/aligned.length).toFixed(5)}`);