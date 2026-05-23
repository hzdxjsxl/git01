function centroid(P) {
  const n = P.length;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += P[i][0]; cy += P[i][1]; cz += P[i][2];
  }
  return [cx / n, cy / n, cz / n];
}

function subtract(P, c) {
  const n = P.length;
  const Q = new Array(n);
  for (let i = 0; i < n; i++) {
    Q[i] = [P[i][0] - c[0], P[i][1] - c[1], P[i][2] - c[2]];
  }
  return Q;
}

function jacobiEigen3x3(A, maxSweeps = 50, tol = 1e-12) {
  let a = [
    [A[0][0], A[0][1], A[0][2]],
    [A[1][0], A[1][1], A[1][2]],
    [A[2][0], A[2][1], A[2][2]],
  ];
  let V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  function rotate(i, j, k, l, s, tau) {
    const g = a[i][j];
    const h = a[k][l];
    a[i][j] = g - s * (h + g * tau);
    a[k][l] = h + s * (g - h * tau);
  }

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    const sm = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (sm < tol) break;

    const tresh = (sweep < 3) ? 0.2 * sm / 9 : 0;

    for (let p = 0; p < 2; p++) {
      for (let q = p + 1; q < 3; q++) {
        const g = 100 * Math.abs(a[p][q]);
        if (sweep > 3 && (Math.abs(a[p][p]) + g === Math.abs(a[p][p])) &&
            (Math.abs(a[q][q]) + g === Math.abs(a[q][q]))) {
          a[p][q] = 0;
        } else if (Math.abs(a[p][q]) > tresh) {
          const h = a[q][q] - a[p][p];
          let t;
          if (Math.abs(h) + g === Math.abs(h)) {
            t = a[p][q] / h;
          } else {
            const theta = 0.5 * h / a[p][q];
            t = 1 / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
            if (theta < 0) t = -t;
          }
          const c = 1 / Math.sqrt(1 + t * t);
          const s = t * c;
          const tau = s / (1 + c);
          const h2 = t * a[p][q];

          a[p][p] -= h2;
          a[q][q] += h2;
          a[p][q] = 0;

          for (let r = 0; r < p; r++) rotate(r, p, r, q, s, tau);
          for (let r = p + 1; r < q; r++) rotate(p, r, r, q, s, tau);
          for (let r = q + 1; r < 3; r++) rotate(p, r, q, r, s, tau);

          for (let r = 0; r < 3; r++) {
            const vi = V[r][p];
            const vj = V[r][q];
            V[r][p] = vi - s * (vj + vi * tau);
            V[r][q] = vj + s * (vi - vj * tau);
          }
        }
      }
    }
  }

  const eigs = [
    { v: a[0][0], i: 0 },
    { v: a[1][1], i: 1 },
    { v: a[2][2], i: 2 },
  ].sort((x, y) => y.v - x.v);

  const vectors = [
    [V[0][eigs[0].i], V[1][eigs[0].i], V[2][eigs[0].i]],
    [V[0][eigs[1].i], V[1][eigs[1].i], V[2][eigs[1].i]],
    [V[0][eigs[2].i], V[1][eigs[2].i], V[2][eigs[2].i]],
  ];
  return { values: [eigs[0].v, eigs[1].v, eigs[2].v], vectors };
}

function svd3x3(H) {
  const HtH = [
    [H[0][0]*H[0][0] + H[1][0]*H[1][0] + H[2][0]*H[2][0],
     H[0][0]*H[0][1] + H[1][0]*H[1][1] + H[2][0]*H[2][1],
     H[0][0]*H[0][2] + H[1][0]*H[1][2] + H[2][0]*H[2][2]],
    [H[0][1]*H[0][0] + H[1][1]*H[1][0] + H[2][1]*H[2][0],
     H[0][1]*H[0][1] + H[1][1]*H[1][1] + H[2][1]*H[2][1],
     H[0][1]*H[0][2] + H[1][1]*H[1][2] + H[2][1]*H[2][2]],
    [H[0][2]*H[0][0] + H[1][2]*H[1][0] + H[2][2]*H[2][0],
     H[0][2]*H[0][1] + H[1][2]*H[1][1] + H[2][2]*H[2][1],
     H[0][2]*H[0][2] + H[1][2]*H[1][2] + H[2][2]*H[2][2]],
  ];
  const eigV = jacobiEigen3x3(HtH);
  const S = eigV.values.map(v => Math.sqrt(Math.max(0, v)));
  const V = eigV.vectors;

  const U = [[0,0,0],[0,0,0],[0,0,0]];
  for (let k = 0; k < 3; k++) {
    const vk = V[k];
    let u0 = H[0][0]*vk[0] + H[0][1]*vk[1] + H[0][2]*vk[2];
    let u1 = H[1][0]*vk[0] + H[1][1]*vk[1] + H[1][2]*vk[2];
    let u2 = H[2][0]*vk[0] + H[2][1]*vk[1] + H[2][2]*vk[2];
    if (S[k] > 1e-10) {
      u0 /= S[k]; u1 /= S[k]; u2 /= S[k];
    } else {
      const mag = Math.sqrt(u0*u0 + u1*u1 + u2*u2);
      if (mag > 1e-10) { u0 /= mag; u1 /= mag; u2 /= mag; }
      else { u0 = 0; u1 = 0; u2 = 0; }
    }
    U[0][k] = u0; U[1][k] = u1; U[2][k] = u2;
  }

  const det3 = (M) =>
    M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
   -M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
   +M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
  const detU = det3(U);
  const detV = det3(V);
  if (detU * detV < 0) {
    U[0][2] = -U[0][2]; U[1][2] = -U[1][2]; U[2][2] = -U[2][2];
  }
  return { U, S, V };
}

function bestRigidTransform(src, dst) {
  const n = src.length;
  const cSrc = centroid(src);
  const cDst = centroid(dst);
  const s = subtract(src, cSrc);
  const d = subtract(dst, cDst);

  const H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < n; i++) {
    const si = s[i], di = d[i];
    H[0][0] += si[0] * di[0]; H[0][1] += si[0] * di[1]; H[0][2] += si[0] * di[2];
    H[1][0] += si[1] * di[0]; H[1][1] += si[1] * di[1]; H[1][2] += si[1] * di[2];
    H[2][0] += si[2] * di[0]; H[2][1] += si[2] * di[1]; H[2][2] += si[2] * di[2];
  }
  const { U, V } = svd3x3(H);
  const R = [
    [U[0][0] * V[0][0] + U[0][1] * V[1][0] + U[0][2] * V[2][0],
     U[0][0] * V[0][1] + U[0][1] * V[1][1] + U[0][2] * V[2][1],
     U[0][0] * V[0][2] + U[0][1] * V[1][2] + U[0][2] * V[2][2]],
    [U[1][0] * V[0][0] + U[1][1] * V[1][0] + U[1][2] * V[2][0],
     U[1][0] * V[0][1] + U[1][1] * V[1][1] + U[1][2] * V[2][1],
     U[1][0] * V[0][2] + U[1][1] * V[1][2] + U[1][2] * V[2][2]],
    [U[2][0] * V[0][0] + U[2][1] * V[1][0] + U[2][2] * V[2][0],
     U[2][0] * V[0][1] + U[2][1] * V[1][1] + U[2][2] * V[2][1],
     U[2][0] * V[0][2] + U[2][1] * V[1][2] + U[2][2] * V[2][2]],
  ];
  const t = [
    cDst[0] - (R[0][0] * cSrc[0] + R[0][1] * cSrc[1] + R[0][2] * cSrc[2]),
    cDst[1] - (R[1][0] * cSrc[0] + R[1][1] * cSrc[1] + R[1][2] * cSrc[2]),
    cDst[2] - (R[2][0] * cSrc[0] + R[2][1] * cSrc[1] + R[2][2] * cSrc[2]),
  ];
  return { R, t };
}

function applyTransform(points, R, t) {
  const n = points.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    out[i] = [
      R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2] + t[0],
      R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2] + t[1],
      R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2] + t[2],
    ];
  }
  return out;
}

function composeTransform(R2, t2, R1, t1) {
  const R = [
    [R2[0][0]*R1[0][0] + R2[0][1]*R1[1][0] + R2[0][2]*R1[2][0],
     R2[0][0]*R1[0][1] + R2[0][1]*R1[1][1] + R2[0][2]*R1[2][1],
     R2[0][0]*R1[0][2] + R2[0][1]*R1[1][2] + R2[0][2]*R1[2][2]],
    [R2[1][0]*R1[0][0] + R2[1][1]*R1[1][0] + R2[1][2]*R1[2][0],
     R2[1][0]*R1[0][1] + R2[1][1]*R1[1][1] + R2[1][2]*R1[2][1],
     R2[1][0]*R1[0][2] + R2[1][1]*R1[1][2] + R2[1][2]*R1[2][2]],
    [R2[2][0]*R1[0][0] + R2[2][1]*R1[1][0] + R2[2][2]*R1[2][0],
     R2[2][0]*R1[0][1] + R2[2][1]*R1[1][1] + R2[2][2]*R1[2][1],
     R2[2][0]*R1[0][2] + R2[2][1]*R1[1][2] + R2[2][2]*R1[2][2]],
  ];
  const t = [
    R2[0][0]*t1[0] + R2[0][1]*t1[1] + R2[0][2]*t1[2] + t2[0],
    R2[1][0]*t1[0] + R2[1][1]*t1[1] + R2[1][2]*t1[2] + t2[1],
    R2[2][0]*t1[0] + R2[2][1]*t1[1] + R2[2][2]*t1[2] + t2[2],
  ];
  return { R, t };
}

function identityTransform() {
  return {
    R: [[1,0,0],[0,1,0],[0,0,1]],
    t: [0,0,0],
  };
}

function meanSquaredDistance(src, dst) {
  const n = Math.min(src.length, dst.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const dx = src[i][0] - dst[i][0];
    const dy = src[i][1] - dst[i][1];
    const dz = src[i][2] - dst[i][2];
    s += dx*dx + dy*dy + dz*dz;
  }
  return s / n;
}

export function icp(source, target, options = {}) {
  const maxIter = options.maxIter || 50;
  const sampleSize = options.sampleSize || 1500;
  const tol = options.tol || 1e-5;
  const kSigma = options.kSigma || 2.0;

  const totalSrc = source.length;
  const totalTgt = target.length;
  const sizeS = Math.min(sampleSize, totalSrc);
  const sizeT = Math.min(sampleSize, totalTgt);

  const srcIdx = new Array(sizeS);
  const stepS = totalSrc / sizeS;
  for (let i = 0; i < sizeS; i++) srcIdx[i] = Math.floor(i * stepS);

  const tgtIdx = new Array(sizeT);
  const stepT = totalTgt / sizeT;
  for (let i = 0; i < sizeT; i++) tgtIdx[i] = Math.floor(i * stepT);

  const srcSubset = srcIdx.map(i => source[i]);
  const tgtSubset = tgtIdx.map(i => target[i]);

  let accumulated = identityTransform();
  let currentPts = srcSubset.map(p => p.slice());

  const iterations = [];
  let prevErr = Infinity;

  for (let k = 0; k < maxIter; k++) {
    const t0 = performance.now();

    const srcSampled = currentPts;
    const nSampled = srcSampled.length;
    const nTgt = tgtSubset.length;

    const correspondences = new Array(nSampled);
    const dists = new Array(nSampled);
    let sumD = 0;
    let sumD2 = 0;

    for (let i = 0; i < nSampled; i++) {
      const p = srcSampled[i];
      let bestIdx = 0;
      let bestD2 = Infinity;
      for (let j = 0; j < nTgt; j++) {
        const q = tgtSubset[j];
        const dx = p[0] - q[0];
        const dy = p[1] - q[1];
        const dz = p[2] - q[2];
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < bestD2) { bestD2 = d2; bestIdx = j; }
      }
      correspondences[i] = bestIdx;
      const d = Math.sqrt(bestD2);
      dists[i] = d;
      sumD += d;
      sumD2 += d * d;
    }

    const mean = sumD / nSampled;
    const variance = (sumD2 / nSampled) - mean * mean;
    const std = Math.sqrt(Math.max(0, variance));
    const threshold = mean + kSigma * std;

    const srcIn = [];
    const dstIn = [];
    for (let i = 0; i < nSampled; i++) {
      if (dists[i] <= threshold) {
        srcIn.push(srcSampled[i]);
        dstIn.push(tgtSubset[correspondences[i]]);
      }
    }

    const { R, t } = bestRigidTransform(srcIn, dstIn);
    currentPts = applyTransform(srcSampled, R, t);
    accumulated = composeTransform(R, t, accumulated.R, accumulated.t);

    const newErr = Math.sqrt(meanSquaredDistance(currentPts, tgtSubset.map((_, i) => tgtSubset[correspondences[i]])));
    const elapsed = performance.now() - t0;
    iterations.push({ iter: k + 1, rmse: newErr, inliers: srcIn.length, timeMs: elapsed.toFixed(2) });

    const delta = Math.abs(prevErr - newErr);
    if (delta < tol && k > 2) break;
    prevErr = newErr;
  }

  return {
    R: accumulated.R,
    t: accumulated.t,
    iterations,
    finalRmse: iterations.length ? iterations[iterations.length - 1].rmse : Infinity,
  };
}

export { applyTransform, centroid, meanSquaredDistance };
