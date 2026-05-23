// ========== ICP Core Functions ==========

function centroid(P) {
  const n = P.length;
  if (n === 0) return [0, 0, 0];
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < n; i++) {
    sx += P[i][0]; sy += P[i][1]; sz += P[i][2];
  }
  return [sx / n, sy / n, sz / n];
}

function rmsScale(P, c) {
  const n = P.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const dx = P[i][0] - c[0], dy = P[i][1] - c[1], dz = P[i][2] - c[2];
    s += dx*dx + dy*dy + dz*dz;
  }
  return Math.sqrt(s / n);
}

function jacobiEigen3x3(A, maxSweeps = 60, tol = 1e-14) {
  let a11 = A[0][0], a12 = A[0][1], a13 = A[0][2];
  let a22 = A[1][1], a23 = A[1][2];
  let a33 = A[2][2];
  let v11 = 1, v12 = 0, v13 = 0;
  let v21 = 0, v22 = 1, v23 = 0;
  let v31 = 0, v32 = 0, v33 = 1;
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    const off = Math.sqrt(a12*a12 + a13*a13 + a23*a23);
    if (off < tol) break;
    const tresh = (sweep < 3) ? 0.2 * off : 0;
    for (let p = 0; p < 2; p++) {
      for (let q = p+1; q < 3; q++) {
        let app, aqq, apq, aip, aiq, vip, viq;
        if (p === 0 && q === 1) {
          app = a11; aqq = a22; apq = a12;
        } else if (p === 0 && q === 2) {
          app = a11; aqq = a33; apq = a13;
        } else {
          app = a22; aqq = a33; apq = a23;
        }
        if (Math.abs(apq) < tol) continue;
        if (Math.abs(apq) < tresh && sweep > 3) continue;
        const t = app - aqq;
        const zeta = -0.5 * t / apq;
        const t2 = 1 / (zeta + Math.sqrt(1 + zeta*zeta));
        const c = 1 / Math.sqrt(1 + t2*t2);
        const s = t2 * c;
        const cs = c * s;
        if (p === 0 && q === 1) {
          a11 = c*c*app + 2*cs*apq + s*s*aqq;
          a22 = s*s*app - 2*cs*apq + c*c*aqq;
          a12 = 0;
          aip = a13; aiq = a23;
          a13 = c*aip + s*aiq;
          a23 = -s*aip + c*aiq;
          vip = v11; viq = v12;
          v11 = c*vip + s*viq;
          v12 = -s*vip + c*viq;
          vip = v21; viq = v22;
          v21 = c*vip + s*viq;
          v22 = -s*vip + c*viq;
          vip = v31; viq = v32;
          v31 = c*vip + s*viq;
          v32 = -s*vip + c*viq;
        } else if (p === 0 && q === 2) {
          a11 = c*c*app + 2*cs*apq + s*s*aqq;
          a33 = s*s*app - 2*cs*apq + c*c*aqq;
          a13 = 0;
          aip = a12; aiq = a23;
          a12 = c*aip + s*aiq;
          a23 = -s*aip + c*aiq;
          vip = v11; viq = v13;
          v11 = c*vip + s*viq;
          v13 = -s*vip + c*viq;
          vip = v21; viq = v23;
          v21 = c*vip + s*viq;
          v23 = -s*vip + c*viq;
          vip = v31; viq = v33;
          v31 = c*vip + s*viq;
          v33 = -s*vip + c*viq;
        } else {
          a22 = c*c*app + 2*cs*apq + s*s*aqq;
          a33 = s*s*app - 2*cs*apq + c*c*aqq;
          a23 = 0;
          aip = a12; aiq = a13;
          a12 = c*aip + s*aiq;
          a13 = -s*aip + c*aiq;
          vip = v12; viq = v13;
          v12 = c*vip + s*viq;
          v13 = -s*vip + c*viq;
          vip = v22; viq = v23;
          v22 = c*vip + s*viq;
          v23 = -s*vip + c*viq;
          vip = v32; viq = v33;
          v32 = c*vip + s*viq;
          v33 = -s*vip + c*viq;
        }
      }
    }
  }
  const eigvals = [a11, a22, a33];
  const V = [[v11,v12,v13],[v21,v22,v23],[v31,v32,v33]];
  const indices = [0, 1, 2].sort((i, j) => eigvals[j] - eigvals[i]);
  const eigvecs = indices.map(i => [V[0][i], V[1][i], V[2][i]]);
  return { values: indices.map(i => eigvals[i]), vectors: eigvecs };
}

function svd3x3(H) {
  const HtH = [
    [H[0][0]*H[0][0]+H[1][0]*H[1][0]+H[2][0]*H[2][0],
     H[0][0]*H[0][1]+H[1][0]*H[1][1]+H[2][0]*H[2][1],
     H[0][0]*H[0][2]+H[1][0]*H[1][2]+H[2][0]*H[2][2]],
    [H[0][1]*H[0][0]+H[1][1]*H[1][0]+H[2][1]*H[2][0],
     H[0][1]*H[0][1]+H[1][1]*H[1][1]+H[2][1]*H[2][1],
     H[0][1]*H[0][2]+H[1][1]*H[1][2]+H[2][1]*H[2][2]],
    [H[0][2]*H[0][0]+H[1][2]*H[1][0]+H[2][2]*H[2][0],
     H[0][2]*H[0][1]+H[1][2]*H[1][1]+H[2][2]*H[2][1],
     H[0][2]*H[0][2]+H[1][2]*H[1][2]+H[2][2]*H[2][2]],
  ];
  const { values: eigs, vectors: Vmat } = jacobiEigen3x3(HtH);
  const sVals = eigs.map(v => Math.sqrt(Math.max(0, v)));
  const maxS = sVals[0] > 0 ? sVals[0] : 1;
  const invS = sVals.map(s => s > 1e-10 * maxS ? 1/s : 0);
  const U = [
    [H[0][0]*Vmat[0][0]*invS[0]+H[0][1]*Vmat[1][0]*invS[0]+H[0][2]*Vmat[2][0]*invS[0],
     H[0][0]*Vmat[0][1]*invS[1]+H[0][1]*Vmat[1][1]*invS[1]+H[0][2]*Vmat[2][1]*invS[1],
     H[0][0]*Vmat[0][2]*invS[2]+H[0][1]*Vmat[1][2]*invS[2]+H[0][2]*Vmat[2][2]*invS[2]],
    [H[1][0]*Vmat[0][0]*invS[0]+H[1][1]*Vmat[1][0]*invS[0]+H[1][2]*Vmat[2][0]*invS[0],
     H[1][0]*Vmat[0][1]*invS[1]+H[1][1]*Vmat[1][1]*invS[1]+H[1][2]*Vmat[2][1]*invS[1],
     H[1][0]*Vmat[0][2]*invS[2]+H[1][1]*Vmat[1][2]*invS[2]+H[1][2]*Vmat[2][2]*invS[2]],
    [H[2][0]*Vmat[0][0]*invS[0]+H[2][1]*Vmat[1][0]*invS[0]+H[2][2]*Vmat[2][0]*invS[0],
     H[2][0]*Vmat[0][1]*invS[1]+H[2][1]*Vmat[1][1]*invS[1]+H[2][2]*Vmat[2][1]*invS[1],
     H[2][0]*Vmat[0][2]*invS[2]+H[2][1]*Vmat[1][2]*invS[2]+H[2][2]*Vmat[2][2]*invS[2]],
  ];
  const detU = U[0][0]*(U[1][1]*U[2][2]-U[1][2]*U[2][1]) - U[0][1]*(U[1][0]*U[2][2]-U[1][2]*U[2][0]) + U[0][2]*(U[1][0]*U[2][1]-U[1][1]*U[2][0]);
  if (detU < 0) {
    for (let i = 0; i < 3; i++) U[i][2] = -U[i][2];
  }
  return { U, S: sVals, V: Vmat };
}

function orthogonalizeRotation(R) {
  const { U, S, V } = svd3x3(R);
  const maxS = Math.max(...S);
  if (maxS < 1e-10) {
    return [[1,0,0],[0,1,0],[0,0,1]];
  }
  return [
    [U[0][0]*V[0][0]+U[0][1]*V[0][1]+U[0][2]*V[0][2],
     U[0][0]*V[1][0]+U[0][1]*V[1][1]+U[0][2]*V[1][2],
     U[0][0]*V[2][0]+U[0][1]*V[2][1]+U[0][2]*V[2][2]],
    [U[1][0]*V[0][0]+U[1][1]*V[0][1]+U[1][2]*V[0][2],
     U[1][0]*V[1][0]+U[1][1]*V[1][1]+U[1][2]*V[1][2],
     U[1][0]*V[2][0]+U[1][1]*V[2][1]+U[1][2]*V[2][2]],
    [U[2][0]*V[0][0]+U[2][1]*V[0][1]+U[2][2]*V[0][2],
     U[2][0]*V[1][0]+U[2][1]*V[1][1]+U[2][2]*V[1][2],
     U[2][0]*V[2][0]+U[2][1]*V[2][1]+U[2][2]*V[2][2]],
  ];
}

function det3x3(R) {
  return R[0][0]*(R[1][1]*R[2][2]-R[1][2]*R[2][1])
       - R[0][1]*(R[1][0]*R[2][2]-R[1][2]*R[2][0])
       + R[0][2]*(R[1][0]*R[2][1]-R[1][1]*R[2][0]);
}

function bestRigidTransform(src, dst) {
  const n = src.length;
  const cs = centroid(src);
  const cd = centroid(dst);
  const srcC = src.map(p => [p[0]-cs[0], p[1]-cs[1], p[2]-cs[2]]);
  const dstC = dst.map(p => [p[0]-cd[0], p[1]-cd[1], p[2]-cd[2]]);
  const H = [[0,0,0],[0,0,0],[0,0,0]];
  for (let k = 0; k < n; k++) {
    const p = srcC[k], q = dstC[k];
    H[0][0] += p[0]*q[0]; H[0][1] += p[0]*q[1]; H[0][2] += p[0]*q[2];
    H[1][0] += p[1]*q[0]; H[1][1] += p[1]*q[1]; H[1][2] += p[1]*q[2];
    H[2][0] += p[2]*q[0]; H[2][1] += p[2]*q[1]; H[2][2] += p[2]*q[2];
  }
  const { U, V } = svd3x3(H);
  let R = [
    [U[0][0]*V[0][0]+U[0][1]*V[0][1]+U[0][2]*V[0][2],
     U[0][0]*V[1][0]+U[0][1]*V[1][1]+U[0][2]*V[1][2],
     U[0][0]*V[2][0]+U[0][1]*V[2][1]+U[0][2]*V[2][2]],
    [U[1][0]*V[0][0]+U[1][1]*V[0][1]+U[1][2]*V[0][2],
     U[1][0]*V[1][0]+U[1][1]*V[1][1]+U[1][2]*V[1][2],
     U[1][0]*V[2][0]+U[1][1]*V[2][1]+U[1][2]*V[2][2]],
    [U[2][0]*V[0][0]+U[2][1]*V[0][1]+U[2][2]*V[0][2],
     U[2][0]*V[1][0]+U[2][1]*V[1][1]+U[2][2]*V[1][2],
     U[2][0]*V[2][0]+U[2][1]*V[2][1]+U[2][2]*V[2][2]],
  ];
  let det = det3x3(R);
  if (Math.abs(det) < 1e-6 || Math.abs(det - 1) > 0.1) {
    R = orthogonalizeRotation(R);
    det = det3x3(R);
  }
  if (Math.abs(det - 1) > 0.5) {
    R = [[1,0,0],[0,1,0],[0,0,1]];
  }
  const t = [
    cd[0] - (R[0][0]*cs[0] + R[0][1]*cs[1] + R[0][2]*cs[2]),
    cd[1] - (R[1][0]*cs[0] + R[1][1]*cs[1] + R[1][2]*cs[2]),
    cd[2] - (R[2][0]*cs[0] + R[2][1]*cs[1] + R[2][2]*cs[2]),
  ];
  return { R, t };
}

function applyTransform(points, R, t) {
  return points.map(p => [
    R[0][0]*p[0] + R[0][1]*p[1] + R[0][2]*p[2] + t[0],
    R[1][0]*p[0] + R[1][1]*p[1] + R[1][2]*p[2] + t[1],
    R[2][0]*p[0] + R[2][1]*p[1] + R[2][2]*p[2] + t[2],
  ]);
}

function composeTransform(R2, t2, R1, t1) {
  const R = [
    [R2[0][0]*R1[0][0]+R2[0][1]*R1[1][0]+R2[0][2]*R1[2][0],
     R2[0][0]*R1[0][1]+R2[0][1]*R1[1][1]+R2[0][2]*R1[2][1],
     R2[0][0]*R1[0][2]+R2[0][1]*R1[1][2]+R2[0][2]*R1[2][2]],
    [R2[1][0]*R1[0][0]+R2[1][1]*R1[1][0]+R2[1][2]*R1[2][0],
     R2[1][0]*R1[0][1]+R2[1][1]*R1[1][1]+R2[1][2]*R1[2][1],
     R2[1][0]*R1[0][2]+R2[1][1]*R1[1][2]+R2[1][2]*R1[2][2]],
    [R2[2][0]*R1[0][0]+R2[2][1]*R1[1][0]+R2[2][2]*R1[2][0],
     R2[2][0]*R1[0][1]+R2[2][1]*R1[1][1]+R2[2][2]*R1[2][1],
     R2[2][0]*R1[0][2]+R2[2][1]*R1[1][2]+R2[2][2]*R1[2][2]],
  ];
  const t = [
    R2[0][0]*t1[0] + R2[0][1]*t1[1] + R2[0][2]*t1[2] + t2[0],
    R2[1][0]*t1[0] + R2[1][1]*t1[1] + R2[1][2]*t1[2] + t2[1],
    R2[2][0]*t1[0] + R2[2][1]*t1[1] + R2[2][2]*t1[2] + t2[2],
  ];
  return { R, t };
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid-1] + s[mid]) / 2;
}

function computePCA(points) {
  const c = centroid(points);
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < points.length; i++) {
    const dx = points[i][0] - c[0], dy = points[i][1] - c[1], dz = points[i][2] - c[2];
    C[0][0] += dx*dx; C[0][1] += dx*dy; C[0][2] += dx*dz;
    C[1][0] += dy*dx; C[1][1] += dy*dy; C[1][2] += dy*dz;
    C[2][0] += dz*dx; C[2][1] += dz*dy; C[2][2] += dz*dz;
  }
  const { values, vectors } = jacobiEigen3x3(C);
  return { centroid: c, values, vectors };
}

function rotationFromAxisAngle(axis, angle) {
  const c = Math.cos(angle), s = Math.sin(angle), omc = 1 - c;
  const ax = axis[0], ay = axis[1], az = axis[2];
  return [
    [c + ax*ax*omc, ax*ay*omc - az*s, ax*az*omc + ay*s],
    [ay*ax*omc + az*s, c + ay*ay*omc, ay*az*omc - ax*s],
    [az*ax*omc - ay*s, az*ay*omc + ax*s, c + az*az*omc],
  ];
}

function rotationAlignVectors(a, b) {
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const absDot = Math.abs(dot);
  if (absDot > 0.999999) {
    if (dot > 0) return [[1,0,0],[0,1,0],[0,0,1]];
    const perp = [0, a[2], -a[1]];
    if (Math.abs(a[0]) > 0.9) perp = [-a[2], 0, a[0]];
    const plen = Math.sqrt(perp[0]**2 + perp[1]**2 + perp[2]**2);
    return rotationFromAxisAngle([perp[0]/plen, perp[1]/plen, perp[2]/plen], Math.PI);
  }
  const axis = [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];
  const alen = Math.sqrt(axis[0]**2 + axis[1]**2 + axis[2]**2);
  if (alen < 1e-10) return [[1,0,0],[0,1,0],[0,0,1]];
  const angle = Math.acos(dot);
  return rotationFromAxisAngle([axis[0]/alen, axis[1]/alen, axis[2]/alen], angle);
}

function getEndBoundaryPoints(points, cutNormal, ratio, useHigh) {
  const n = points.length;
  const c = centroid(points);
  const projections = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
    projections[i] = dx*cutNormal[0] + dy*cutNormal[1] + dz*cutNormal[2];
  }
  const sorted = projections
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);

  const count = Math.max(10, Math.floor(n * ratio));
  const boundary = [];
  if (useHigh) {
    for (let i = n - count; i < n; i++) boundary.push(points[sorted[i].i]);
  } else {
    for (let i = 0; i < count; i++) boundary.push(points[sorted[i].i]);
  }
  return boundary;
}

function evaluateBoundaryMatch(srcBnd, tgtBnd, R, t) {
  const transformed = applyTransform(srcBnd, R, t);
  let sumD2 = 0;
  const checkN = Math.min(transformed.length, 100);
  const step = Math.max(1, Math.floor(transformed.length / checkN));
  let count = 0;
  for (let i = 0; i < transformed.length && count < checkN; i += step) {
    const p = transformed[i];
    let minD2 = Infinity;
    for (let j = 0; j < tgtBnd.length; j++) {
      const q = tgtBnd[j];
      const ddx = p[0]-q[0], ddy = p[1]-q[1], ddz = p[2]-q[2];
      const d2 = ddx*ddx + ddy*ddy + ddz*ddz;
      if (d2 < minD2) minD2 = d2;
    }
    sumD2 += minD2;
    count++;
  }
  return sumD2 / count;
}

function pcaAlignmentWithSigns(srcPts, tgtPts) {
  const srcPCA = computePCA(srcPts);
  const tgtPCA = computePCA(tgtPts);
  const sv = srcPCA.vectors;
  const tv = tgtPCA.vectors;

  const srcCutNormCandidates = [sv[2], [-sv[2][0], -sv[2][1], -sv[2][2]]];
  const tgtCutNormal = tv[2];

  const boundaryRatio = 0.25;

  let bestErr = Infinity;
  let bestR = [[1,0,0],[0,1,0],[0,0,1]];
  let bestT = [0,0,0];
  let bestSrcUseHigh = false;
  let bestTgtUseHigh = false;
  let bestSrcNormal = sv[2];

  for (const srcNormal of srcCutNormCandidates) {
    for (const srcUseHigh of [false, true]) {
      for (const tgtUseHigh of [false, true]) {
        const R_align = rotationAlignVectors(srcNormal, tgtCutNormal);
        const srcC = srcPCA.centroid;
        const tgtC = tgtPCA.centroid;

        const centroidAlignT = [
          tgtC[0] - (R_align[0][0]*srcC[0] + R_align[0][1]*srcC[1] + R_align[0][2]*srcC[2]),
          tgtC[1] - (R_align[1][0]*srcC[0] + R_align[1][1]*srcC[1] + R_align[1][2]*srcC[2]),
          tgtC[2] - (R_align[2][0]*srcC[0] + R_align[2][1]*srcC[1] + R_align[2][2]*srcC[2]),
        ];

        const srcBnd = getEndBoundaryPoints(srcPts, srcNormal, boundaryRatio, srcUseHigh);
        const tgtBnd = getEndBoundaryPoints(tgtPts, tgtCutNormal, boundaryRatio, tgtUseHigh);

        const transformedBnd = applyTransform(srcBnd, R_align, centroidAlignT);
        const srcBndC = centroid(transformedBnd);
        const tgtBndC = centroid(tgtBnd);

        const separation = [
          tgtBndC[0] - srcBndC[0],
          tgtBndC[1] - srcBndC[1],
          tgtBndC[2] - srcBndC[2],
        ];

        const adjustedT = [
          centroidAlignT[0] + separation[0],
          centroidAlignT[1] + separation[1],
          centroidAlignT[2] + separation[2],
        ];

        let R_refined = R_align;
        let t_refined = adjustedT;

        for (let refine = 0; refine < 5; refine++) {
          const curBnd = applyTransform(srcBnd, R_refined, t_refined);
          const corrIdx = [];
          const corrDists = [];
          for (let i = 0; i < curBnd.length; i++) {
            const p = curBnd[i];
            let bestJ = 0, bestD2 = Infinity;
            for (let j = 0; j < tgtBnd.length; j++) {
              const q = tgtBnd[j];
              const d2 = (p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
              if (d2 < bestD2) { bestD2 = d2; bestJ = j; }
            }
            corrIdx.push(bestJ);
            corrDists.push(Math.sqrt(bestD2));
          }
          const sorted = corrDists.map((d,i)=>({d,i})).sort((a,b)=>a.d-b.d);
          const trimCount = Math.max(10, Math.floor(curBnd.length * 0.7));
          const srcIn = [], dstIn = [];
          for (let k = 0; k < trimCount; k++) {
            const item = sorted[k];
            if (item.d < 0.5) {
              srcIn.push(curBnd[item.i]);
              dstIn.push(tgtBnd[corrIdx[item.i]]);
            }
          }
          if (srcIn.length < 6) break;
          const { R, t } = bestRigidTransform(srcIn, dstIn);
          if (det3x3(R) < 0.5) break;
          const comp = composeTransform(R, t, R_refined, t_refined);
          R_refined = comp.R;
          t_refined = comp.t;
        }

        const err = evaluateBoundaryMatch(srcBnd, tgtBnd, R_refined, t_refined);

        if (err < bestErr) {
          bestErr = err;
          bestR = R_refined;
          bestT = t_refined;
          bestSrcUseHigh = srcUseHigh;
          bestTgtUseHigh = tgtUseHigh;
          bestSrcNormal = srcNormal;
        }
      }
    }
  }

  return { R: bestR, t: bestT, initError: Math.sqrt(bestErr), srcUseHigh: bestSrcUseHigh, tgtUseHigh: bestTgtUseHigh, srcCutNormal: bestSrcNormal, tgtCutNormal };
}

function slerpMatrix(R, identity, t) {
  const trace = R[0][0] + R[1][1] + R[2][2];
  const cosTheta = Math.max(-1, Math.min(1, (trace - 1) / 2));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-10) return [[1,0,0],[0,1,0],[0,0,1]];
  const sinTheta = Math.sin(theta);
  if (Math.abs(sinTheta) < 1e-10) {
    return [[1,0,0],[0,1,0],[0,0,1]];
  }
  const axis = [
    (R[2][1] - R[1][2]) / (2 * sinTheta),
    (R[0][2] - R[2][0]) / (2 * sinTheta),
    (R[1][0] - R[0][1]) / (2 * sinTheta),
  ];
  const alen = Math.sqrt(axis[0]**2 + axis[1]**2 + axis[2]**2);
  if (alen < 1e-10) return [[1,0,0],[0,1,0],[0,0,1]];
  return rotationFromAxisAngle(
    [axis[0]/alen, axis[1]/alen, axis[2]/alen],
    theta * t
  );
}

function icp(source, target, options = {}) {
  const {
    maxIter = 50,
    sampleSize = 1500,
    tol = 1e-5,
    kSigma = 2.5,
    trimRatio = 0.5,
    maxDist = 1.0,
    boundaryRatio = 0.25,
  } = options;

  const totalSrc = source.length;
  const totalTgt = target.length;
  const cs = centroid(source);
  const ct = centroid(target);
  const sScale = rmsScale(source, cs);
  const tScale = rmsScale(target, ct);
  const commonScale = sScale > tScale ? sScale : tScale;
  const scale = commonScale > 1e-10 ? commonScale : 1;

  const srcNorm = source.map(p => [(p[0] - cs[0]) / scale, (p[1] - cs[1]) / scale, (p[2] - cs[2]) / scale]);
  const tgtNorm = target.map(p => [(p[0] - ct[0]) / scale, (p[1] - ct[1]) / scale, (p[2] - ct[2]) / scale]);

  const sizeS = Math.min(sampleSize, totalSrc);
  const sizeT = Math.min(sampleSize, totalTgt);

  const srcIdx = new Array(sizeS);
  const stepS = totalSrc / sizeS;
  for (let i = 0; i < sizeS; i++) srcIdx[i] = Math.floor(i * stepS);

  const tgtIdx = new Array(sizeT);
  const stepT = totalTgt / sizeT;
  for (let i = 0; i < sizeT; i++) tgtIdx[i] = Math.floor(i * stepT);

  const srcSubset = srcIdx.map(i => srcNorm[i]);
  const tgtSubset = tgtIdx.map(i => tgtNorm[i]);

  const pcaInit = pcaAlignmentWithSigns(srcSubset, tgtSubset);

  const srcBndAll = getEndBoundaryPoints(srcNorm, pcaInit.srcCutNormal, boundaryRatio, pcaInit.srcUseHigh);
  const tgtBndAll = getEndBoundaryPoints(tgtNorm, pcaInit.tgtCutNormal, boundaryRatio, pcaInit.tgtUseHigh);
  const srcBndSubset = srcBndAll.filter((_, i) => i % Math.max(1, Math.floor(srcBndAll.length/300)) === 0);
  const tgtBndSubset = tgtBndAll.filter((_, i) => i % Math.max(1, Math.floor(tgtBndAll.length/300)) === 0);

  const tgtPCA = computePCA(tgtNorm);
  const tgtProj = tgtSubset.map(p =>
    (p[0]-tgtPCA.centroid[0])*pcaInit.tgtCutNormal[0] +
    (p[1]-tgtPCA.centroid[1])*pcaInit.tgtCutNormal[1] +
    (p[2]-tgtPCA.centroid[2])*pcaInit.tgtCutNormal[2]
  );
  const sortedProj = tgtProj.slice().sort((a,b)=>a-b);
  const boundaryCount = Math.floor(sortedProj.length * boundaryRatio);
  let tgtThresh;
  if (pcaInit.tgtUseHigh) {
    tgtThresh = sortedProj[sortedProj.length - boundaryCount];
  } else {
    tgtThresh = sortedProj[boundaryCount];
  }
  const tgtBndMask = tgtSubset.map((_, i) =>
    pcaInit.tgtUseHigh ? tgtProj[i] >= tgtThresh : tgtProj[i] <= tgtThresh
  );
  const tgtBndOnlyPts = tgtSubset.filter((_, i) => tgtBndMask[i]);

  const srcPCA = computePCA(srcNorm);
  const srcProj = srcSubset.map(p =>
    (p[0]-srcPCA.centroid[0])*pcaInit.srcCutNormal[0] +
    (p[1]-srcPCA.centroid[1])*pcaInit.srcCutNormal[1] +
    (p[2]-srcPCA.centroid[2])*pcaInit.srcCutNormal[2]
  );
  const sortedSrcProj = srcProj.slice().sort((a,b)=>a-b);
  const srcBoundaryCount = Math.floor(sortedSrcProj.length * boundaryRatio);
  let srcThresh;
  if (pcaInit.srcUseHigh) {
    srcThresh = sortedSrcProj[sortedSrcProj.length - srcBoundaryCount];
  } else {
    srcThresh = sortedSrcProj[srcBoundaryCount];
  }
  const srcBndMask = srcSubset.map((_, i) =>
    pcaInit.srcUseHigh ? srcProj[i] >= srcThresh : srcProj[i] <= srcThresh
  );

  let accumulated = pcaInit;
  let currentPts = applyTransform(srcSubset, pcaInit.R, pcaInit.t);

  function boundaryNN(R, t) {
    const transformed = applyTransform(srcBndSubset, R, t);
    let sumD = 0;
    for (let i = 0; i < transformed.length; i++) {
      const p = transformed[i];
      let bestD2 = Infinity;
      for (let j = 0; j < tgtBndSubset.length; j++) {
        const q = tgtBndSubset[j];
        const d2 = (p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2;
        if (d2 < bestD2) bestD2 = d2;
      }
      sumD += Math.sqrt(bestD2);
    }
    return sumD / transformed.length;
  }

  const iterations = [];
  let prevErr = Infinity;
  let bestBoundaryErr = boundaryNN(pcaInit.R, pcaInit.t);
  let bestOverall = { R: accumulated.R, t: accumulated.t, err: Infinity, bndErr: bestBoundaryErr };

  for (let k = 0; k < maxIter; k++) {
    const t0 = performance.now();
    const nSampled = currentPts.length;
    const nTgtBnd = tgtBndOnlyPts.length;

    const correspondences = new Array(nSampled);
    const dists = new Array(nSampled);

    for (let i = 0; i < nSampled; i++) {
      const p = currentPts[i];
      let bestIdx = 0;
      let bestD2 = Infinity;
      for (let j = 0; j < nTgtBnd; j++) {
        const q = tgtBndOnlyPts[j];
        const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < bestD2) { bestD2 = d2; bestIdx = j; }
      }
      correspondences[i] = bestIdx;
      dists[i] = Math.sqrt(bestD2);
    }

    const sortedIdx = dists
      .map((d, i) => ({ d, i, isBnd: srcBndMask[i] }))
      .sort((a, b) => a.d - b.d);

    const maxTrimCount = Math.max(3, Math.floor(nSampled * trimRatio));
    const bndCandidates = sortedIdx.filter(x => x.isBnd);
    const trimmed = bndCandidates.slice(0, maxTrimCount);

    if (trimmed.length < 6) break;

    const trimmedDists = trimmed.map(x => x.d);
    const medDist = median(trimmedDists);
    const mad = median(trimmedDists.map(d => Math.abs(d - medDist)));
    const madThreshold = medDist + kSigma * (mad * 1.4826);

    const srcIn = [];
    const dstIn = [];
    for (let k2 = 0; k2 < trimmed.length; k2++) {
      const item = trimmed[k2];
      if (item.d <= maxDist && item.d <= madThreshold) {
        srcIn.push(currentPts[item.i]);
        dstIn.push(tgtBndOnlyPts[correspondences[item.i]]);
      }
    }

    if (srcIn.length < 6) break;

    const { R, t } = bestRigidTransform(srcIn, dstIn);
    if (det3x3(R) < 0.5) continue;

    const testR = composeTransform(R, t, accumulated.R, accumulated.t);
    const bndErr = boundaryNN(testR.R, testR.t);

    const lr = bndErr < bestBoundaryErr * 1.05 ? 1.0 : 0.2;
    const stepR = lr < 1.0 ? slerpMatrix(R, [[1,0,0],[0,1,0],[0,0,1]], lr) : R;
    const stepT = lr < 1.0 ? [t[0]*lr, t[1]*lr, t[2]*lr] : t;

    currentPts = applyTransform(currentPts, stepR, stepT);
    accumulated = composeTransform(stepR, stepT, accumulated.R, accumulated.t);
    if (Math.abs(det3x3(accumulated.R) - 1) > 0.1) {
      const newR = orthogonalizeRotation(accumulated.R);
      if (det3x3(newR) > 0.5) accumulated.R = newR;
    }

    if (bndErr < bestBoundaryErr) {
      bestBoundaryErr = bndErr;
      bestOverall = { R: accumulated.R, t: accumulated.t, err: Infinity, bndErr: bndErr };
    }

    const transformedSrc = applyTransform(srcIn, stepR, stepT);
    let errSum = 0;
    for (let i = 0; i < transformedSrc.length; i++) {
      const p = transformedSrc[i];
      const tp = dstIn[i];
      errSum += (p[0]-tp[0])**2 + (p[1]-tp[1])**2 + (p[2]-tp[2])**2;
    }
    const newErr = Math.sqrt(errSum / srcIn.length);

    if (newErr < bestOverall.err && det3x3(accumulated.R) > 0.5) {
      bestOverall = { R: accumulated.R, t: accumulated.t, err: newErr, bndErr: bndErr };
    }

    const elapsed = performance.now() - t0;
    iterations.push({
      iter: k + 1, rmse: newErr, inliers: srcIn.length,
      timeMs: elapsed.toFixed(2), medDist: medDist,
    });

    const delta = Math.abs(prevErr - newErr);
    if (delta < tol && k > 2) break;
    prevErr = newErr;
  }

  accumulated = { R: bestOverall.R, t: bestOverall.t };

  const Rn = accumulated.R;
  const tn = accumulated.t;

  const R = [
    [Rn[0][0], Rn[0][1], Rn[0][2]],
    [Rn[1][0], Rn[1][1], Rn[1][2]],
    [Rn[2][0], Rn[2][1], Rn[2][2]],
  ];
  const t = [
    ct[0] + scale * tn[0] - (R[0][0]*cs[0] + R[0][1]*cs[1] + R[0][2]*cs[2]),
    ct[1] + scale * tn[1] - (R[1][0]*cs[0] + R[1][1]*cs[1] + R[1][2]*cs[2]),
    ct[2] + scale * tn[2] - (R[2][0]*cs[0] + R[2][1]*cs[1] + R[2][2]*cs[2]),
  ];

  return {
    R, t,
    iterations,
    finalRmse: iterations.length ? iterations[iterations.length - 1].rmse : Infinity,
  };
}

export { applyTransform, centroid, rmsScale, icp, computePCA, getEndBoundaryPoints, svd3x3, det3x3, orthogonalizeRotation, median, bestRigidTransform, jacobiEigen3x3 };
