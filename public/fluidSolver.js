class FluidSolver3D {
  constructor(config) {
    this.nx = config.nx;
    this.ny = config.ny;
    this.nz = config.nz;
    this.dx = config.cellSize || 1.0;
    this.dt = config.dt || 0.1;
    this.viscosity = config.viscosity || 0.00005;
    this.windDir = config.windDir || [1, 0, 0];
    this.windSpeed = config.windSpeed || 6.0;
    this.vorticityConfinement = config.vorticityConfinement || 0.8;
    this.size = this.nx * this.ny * this.nz;

    this.u = new Float32Array(this.size);
    this.v = new Float32Array(this.size);
    this.w = new Float32Array(this.size);

    this.uPrev = new Float32Array(this.size);
    this.vPrev = new Float32Array(this.size);
    this.wPrev = new Float32Array(this.size);

    this.p = new Float32Array(this.size);
    this.div = new Float32Array(this.size);

    this.curlX = new Float32Array(this.size);
    this.curlY = new Float32Array(this.size);
    this.curlZ = new Float32Array(this.size);
    this.curlMag = new Float32Array(this.size);

    this.obstacle = new Uint8Array(this.size);
    this.obstacleDist = new Float32Array(this.size);
    this.obstacleNormalX = new Float32Array(this.size);
    this.obstacleNormalY = new Float32Array(this.size);
    this.obstacleNormalZ = new Float32Array(this.size);

    this.bounds = config.bounds || {
      minX: -60, maxX: 60,
      minY: -20, maxY: 220,
      minZ: -30, maxZ: 30
    };

    this.domainMin = { x: this.bounds.minX - 50, y: this.bounds.minY - 15, z: this.bounds.minZ - 50 };
    this.domainMax = { x: this.bounds.maxX + 50, y: this.bounds.maxY + 40, z: this.bounds.maxZ + 50 };

    this.buildingBoxes = [];
  }

  idx(i, j, k) {
    return i + this.nx * (j + this.ny * k);
  }

  worldToGrid(wx, wy, wz) {
    const fx = (wx - this.domainMin.x) / (this.domainMax.x - this.domainMin.x) * (this.nx - 1);
    const fy = (wy - this.domainMin.y) / (this.domainMax.y - this.domainMin.y) * (this.ny - 1);
    const fz = (wz - this.domainMin.z) / (this.domainMax.z - this.domainMin.z) * (this.nz - 1);
    return [fx, fy, fz];
  }

  gridToWorld(i, j, k) {
    return [
      this.domainMin.x + (i / (this.nx - 1)) * (this.domainMax.x - this.domainMin.x),
      this.domainMin.y + (j / (this.ny - 1)) * (this.domainMax.y - this.domainMin.y),
      this.domainMin.z + (k / (this.nz - 1)) * (this.domainMax.z - this.domainMin.z)
    ];
  }

  setObstacle(vertices, faces) {
    this.obstacle.fill(0);
    this.obstacleDist.fill(1e10);
    const vertArr = vertices;

    this.buildingBoxes = [];
    for (let f = 0; f < faces.length; f += 12) {
      const vertexIndices = new Set();
      for (let t = 0; t < 12; t++) {
        const face = faces[f + t];
        vertexIndices.add(face[0]);
        vertexIndices.add(face[1]);
        vertexIndices.add(face[2]);
      }

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const vi of vertexIndices) {
        const idx = vi * 3;
        const x = vertArr[idx], y = vertArr[idx + 1], z = vertArr[idx + 2];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      this.buildingBoxes.push({ minX, minY, minZ, maxX, maxY, maxZ });
    }

    const margin = 1.0;
    for (let k = 0; k < this.nz; k++) {
      for (let j = 0; j < this.ny; j++) {
        for (let i = 0; i < this.nx; i++) {
          const idx = this.idx(i, j, k);
          const [wx, wy, wz] = this.gridToWorld(i, j, k);

          let minDist = 1e10;
          let closestNormal = [0, 1, 0];
          let isInside = false;

          for (const box of this.buildingBoxes) {
            if (wx >= box.minX - margin && wx <= box.maxX + margin &&
                wy >= box.minY - margin && wy <= box.maxY + margin &&
                wz >= box.minZ - margin && wz <= box.maxZ + margin) {
              this.obstacle[idx] = 1;

              const dxMin = Math.abs(wx - box.minX);
              const dxMax = Math.abs(wx - box.maxX);
              const dyMin = Math.abs(wy - box.minY);
              const dyMax = Math.abs(wy - box.maxY);
              const dzMin = Math.abs(wz - box.minZ);
              const dzMax = Math.abs(wz - box.maxZ);

              const minDx = Math.min(dxMin, dxMax);
              const minDy = Math.min(dyMin, dyMax);
              const minDz = Math.min(dzMin, dzMax);

              const dist = Math.min(minDx, minDy, minDz);
              if (dist < minDist) {
                minDist = dist;
                if (minDx <= minDy && minDx <= minDz) {
                  closestNormal = dxMin < dxMax ? [-1, 0, 0] : [1, 0, 0];
                } else if (minDy <= minDx && minDy <= minDz) {
                  closestNormal = dyMin < dyMax ? [0, -1, 0] : [0, 1, 0];
                } else {
                  closestNormal = dzMin < dzMax ? [0, 0, -1] : [0, 0, 1];
                }
              }

              if (wx >= box.minX && wx <= box.maxX &&
                  wy >= box.minY && wy <= box.maxY &&
                  wz >= box.minZ && wz <= box.maxZ) {
                isInside = true;
              }
            }
          }

          if (this.obstacle[idx]) {
            this.obstacleDist[idx] = isInside ? -minDist : minDist;
            this.obstacleNormalX[idx] = closestNormal[0];
            this.obstacleNormalY[idx] = closestNormal[1];
            this.obstacleNormalZ[idx] = closestNormal[2];
          }
        }
      }
    }

    this.computeObstacleDistanceField();
  }

  computeObstacleDistanceField() {
    const nx = this.nx, ny = this.ny, nz = this.nz;
    const inf = 1e10;

    for (let iter = 0; iter < 3; iter++) {
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            const idx = this.idx(i, j, k);
            if (this.obstacle[idx]) continue;

            let minDist = this.obstacleDist[idx];
            let bestNx = this.obstacleNormalX[idx];
            let bestNy = this.obstacleNormalY[idx];
            let bestNz = this.obstacleNormalZ[idx];

            const neighbors = [
              [i - 1, j, k], [i + 1, j, k],
              [i, j - 1, k], [i, j + 1, k],
              [i, j, k - 1], [i, j, k + 1]
            ];

            for (const [ni, nj, nk] of neighbors) {
              const nIdx = this.idx(ni, nj, nk);
              const nd = this.obstacleDist[nIdx] + 1;
              if (nd < minDist) {
                minDist = nd;
                bestNx = this.obstacleNormalX[nIdx];
                bestNy = this.obstacleNormalY[nIdx];
                bestNz = this.obstacleNormalZ[nIdx];
              }
            }

            this.obstacleDist[idx] = minDist;
            this.obstacleNormalX[idx] = bestNx;
            this.obstacleNormalY[idx] = bestNy;
            this.obstacleNormalZ[idx] = bestNz;
          }
        }
      }
    }

    let maxDist = 0;
    for (let idx = 0; idx < this.size; idx++) {
      if (this.obstacleDist[idx] < 1e9 && this.obstacleDist[idx] > maxDist) {
        maxDist = this.obstacleDist[idx];
      }
    }
    if (maxDist > 0) {
      for (let idx = 0; idx < this.size; idx++) {
        if (this.obstacleDist[idx] > 1e9) {
          this.obstacleDist[idx] = maxDist;
        }
      }
    }
  }

  step() {
    this.addWind();
    this.computeVorticity();
    this.applyVorticityConfinement();
    this.advect(this.u, this.uPrev);
    this.advect(this.v, this.vPrev);
    this.advect(this.w, this.wPrev);
    this.diffuse(this.u, this.uPrev);
    this.diffuse(this.v, this.vPrev);
    this.diffuse(this.w, this.wPrev);
    this.project();
    this.enforceObstacleSlip();
    this.enforceBoundaries();
  }

  addWind() {
    const margin = 3;
    const dir = this.windDir;
    const speed = this.windSpeed;
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < margin; i++) {
          const idx = this.idx(i, j, k);
          if (!this.obstacle[idx]) {
            this.u[idx] = dir[0] * speed;
            this.v[idx] = dir[1] * speed;
            this.w[idx] = dir[2] * speed;
          }
        }
      }
    }
  }

  computeVorticity() {
    const h = this.dx;
    const inv2h = 1 / (2 * h);
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) {
            this.curlX[idx] = 0;
            this.curlY[idx] = 0;
            this.curlZ[idx] = 0;
            this.curlMag[idx] = 0;
            continue;
          }

          const dvy_dx = (this.v[this.idx(i + 1, j, k)] - this.v[this.idx(i - 1, j, k)]) * inv2h;
          const dvz_dx = (this.w[this.idx(i + 1, j, k)] - this.w[this.idx(i - 1, j, k)]) * inv2h;
          const dux_dy = (this.u[this.idx(i, j + 1, k)] - this.u[this.idx(i, j - 1, k)]) * inv2h;
          const dvz_dy = (this.w[this.idx(i, j + 1, k)] - this.w[this.idx(i, j - 1, k)]) * inv2h;
          const dux_dz = (this.u[this.idx(i, j, k + 1)] - this.u[this.idx(i, j, k - 1)]) * inv2h;
          const dvy_dz = (this.v[this.idx(i, j, k + 1)] - this.v[this.idx(i, j, k - 1)]) * inv2h;

          this.curlX[idx] = dvz_dy - dvy_dz;
          this.curlY[idx] = dux_dz - dvz_dx;
          this.curlZ[idx] = dvy_dx - dux_dy;

          this.curlMag[idx] = Math.sqrt(
            this.curlX[idx] * this.curlX[idx] +
            this.curlY[idx] * this.curlY[idx] +
            this.curlZ[idx] * this.curlZ[idx]
          );
        }
      }
    }
  }

  applyVorticityConfinement() {
    const h = this.dx;
    const inv2h = 1 / (2 * h);
    const eps = 1e-8;
    const nx = this.nx, ny = this.ny, nz = this.nz;
    const dt = this.dt;
    const strength = this.vorticityConfinement;

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) continue;
          if (this.curlMag[idx] < eps) continue;

          const dMag_dx = (this.curlMag[this.idx(i + 1, j, k)] - this.curlMag[this.idx(i - 1, j, k)]) * inv2h;
          const dMag_dy = (this.curlMag[this.idx(i, j + 1, k)] - this.curlMag[this.idx(i, j - 1, k)]) * inv2h;
          const dMag_dz = (this.curlMag[this.idx(i, j, k + 1)] - this.curlMag[this.idx(i, j, k - 1)]) * inv2h;

          const magLen = Math.sqrt(dMag_dx * dMag_dx + dMag_dy * dMag_dy + dMag_dz * dMag_dz) + eps;
          const Nx = dMag_dx / magLen;
          const Ny = dMag_dy / magLen;
          const Nz = dMag_dz / magLen;

          const forceX = strength * h * (Ny * this.curlZ[idx] - Nz * this.curlY[idx]);
          const forceY = strength * h * (Nz * this.curlX[idx] - Nx * this.curlZ[idx]);
          const forceZ = strength * h * (Nx * this.curlY[idx] - Ny * this.curlX[idx]);

          this.u[idx] += dt * forceX;
          this.v[idx] += dt * forceY;
          this.w[idx] += dt * forceZ;
        }
      }
    }
  }

  advect(field, prevField) {
    prevField.set(field);
    const dt = this.dt;
    const dx = this.dx;
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) continue;

          let x = i - dt * this.u[idx] / dx;
          let y = j - dt * this.v[idx] / dx;
          let z = k - dt * this.w[idx] / dx;

          x = Math.max(0.5, Math.min(nx - 1.5, x));
          y = Math.max(0.5, Math.min(ny - 1.5, y));
          z = Math.max(0.5, Math.min(nz - 1.5, z));

          const i0 = Math.floor(x);
          const j0 = Math.floor(y);
          const k0 = Math.floor(z);
          const i1 = i0 + 1;
          const j1 = j0 + 1;
          const k1 = k0 + 1;

          const fx = x - i0;
          const fy = y - j0;
          const fz = z - k0;

          const c000 = prevField[this.idx(i0, j0, k0)];
          const c100 = prevField[this.idx(i1, j0, k0)];
          const c010 = prevField[this.idx(i0, j1, k0)];
          const c110 = prevField[this.idx(i1, j1, k0)];
          const c001 = prevField[this.idx(i0, j0, k1)];
          const c101 = prevField[this.idx(i1, j0, k1)];
          const c011 = prevField[this.idx(i0, j1, k1)];
          const c111 = prevField[this.idx(i1, j1, k1)];

          const c00 = c000 * (1 - fx) + c100 * fx;
          const c10 = c010 * (1 - fx) + c110 * fx;
          const c01 = c001 * (1 - fx) + c101 * fx;
          const c11 = c011 * (1 - fx) + c111 * fx;

          const c0 = c00 * (1 - fy) + c10 * fy;
          const c1 = c01 * (1 - fy) + c11 * fy;

          field[idx] = c0 * (1 - fz) + c1 * fz;
        }
      }
    }
  }

  diffuse(field, prevField) {
    if (this.viscosity <= 0) return;
    prevField.set(field);
    const a = this.dt * this.viscosity / (this.dx * this.dx);
    const c = 1 + 6 * a;
    const invC = 1 / c;
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let iter = 0; iter < 3; iter++) {
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            const idx = this.idx(i, j, k);
            if (this.obstacle[idx]) continue;
            field[idx] = (prevField[idx] + a * (
              field[this.idx(i - 1, j, k)] + field[this.idx(i + 1, j, k)] +
              field[this.idx(i, j - 1, k)] + field[this.idx(i, j + 1, k)] +
              field[this.idx(i, j, k - 1)] + field[this.idx(i, j, k + 1)]
            )) * invC;
          }
        }
      }
    }
  }

  project() {
    const h = this.dx;
    const inv2h = 1 / (2 * h);
    const h2 = h * h;
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) { this.div[idx] = 0; continue; }
          this.div[idx] = (
            (this.u[this.idx(i + 1, j, k)] - this.u[this.idx(i - 1, j, k)]) +
            (this.v[this.idx(i, j + 1, k)] - this.v[this.idx(i, j - 1, k)]) +
            (this.w[this.idx(i, j, k + 1)] - this.w[this.idx(i, j, k - 1)])
          ) * inv2h;
          this.p[idx] = 0;
        }
      }
    }

    for (let iter = 0; iter < 20; iter++) {
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            const idx = this.idx(i, j, k);
            if (this.obstacle[idx]) continue;
            this.p[idx] = (
              this.p[this.idx(i - 1, j, k)] + this.p[this.idx(i + 1, j, k)] +
              this.p[this.idx(i, j - 1, k)] + this.p[this.idx(i, j + 1, k)] +
              this.p[this.idx(i, j, k - 1)] + this.p[this.idx(i, j, k + 1)] -
              h2 * this.div[idx]
            ) * 0.16666667;
          }
        }
      }
    }

    const dt = this.dt;
    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) continue;
          this.u[idx] -= dt * (this.p[this.idx(i + 1, j, k)] - this.p[this.idx(i - 1, j, k)]) * inv2h;
          this.v[idx] -= dt * (this.p[this.idx(i, j + 1, k)] - this.p[this.idx(i, j - 1, k)]) * inv2h;
          this.w[idx] -= dt * (this.p[this.idx(i, j, k + 1)] - this.p[this.idx(i, j, k - 1)]) * inv2h;
        }
      }
    }
  }

  enforceObstacleSlip() {
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let k = 1; k < nz - 1; k++) {
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = this.idx(i, j, k);
          if (this.obstacle[idx]) {
            this.u[idx] = 0;
            this.v[idx] = 0;
            this.w[idx] = 0;
            continue;
          }

          const dist = this.obstacleDist[idx];
          if (dist < 2.0) {
            const nx_val = this.obstacleNormalX[idx];
            const ny_val = this.obstacleNormalY[idx];
            const nz_val = this.obstacleNormalZ[idx];

            const dot = this.u[idx] * nx_val + this.v[idx] * ny_val + this.w[idx] * nz_val;

            const falloff = Math.max(0, 1.0 - dist * 0.5);
            this.u[idx] -= dot * nx_val * falloff;
            this.v[idx] -= dot * ny_val * falloff;
            this.w[idx] -= dot * nz_val * falloff;
          }
        }
      }
    }
  }

  enforceBoundaries() {
    const nx = this.nx, ny = this.ny, nz = this.nz;
    const margin = 1;
    const speed = this.windSpeed;
    const dir = this.windDir;

    for (let k = margin; k < nz - margin; k++) {
      for (let j = margin; j < ny - margin; j++) {
        for (let i = 0; i < margin; i++) {
          const idx = this.idx(i, j, k);
          if (!this.obstacle[idx]) {
            this.u[idx] = dir[0] * speed;
            this.v[idx] = dir[1] * speed;
            this.w[idx] = dir[2] * speed;
          }
        }
        for (let i = nx - margin; i < nx; i++) {
          const idx = this.idx(i, j, k);
          if (!this.obstacle[idx]) {
            this.u[idx] = this.u[this.idx(nx - margin - 1, j, k)];
            this.v[idx] = this.v[this.idx(nx - margin - 1, j, k)];
            this.w[idx] = this.w[this.idx(nx - margin - 1, j, k)];
          }
        }
      }
    }
  }

  getVelocityAt(wx, wy, wz) {
    const fx = (wx - this.domainMin.x) / (this.domainMax.x - this.domainMin.x) * (this.nx - 1);
    const fy = (wy - this.domainMin.y) / (this.domainMax.y - this.domainMin.y) * (this.ny - 1);
    const fz = (wz - this.domainMin.z) / (this.domainMax.z - this.domainMin.z) * (this.nz - 1);

    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.ny - 2, Math.floor(fy)));
    const k = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));

    const tx = fx - i;
    const ty = fy - j;
    const tz = fz - k;

    const c00 = this.idx(i, j, k);
    const c10 = this.idx(i + 1, j, k);
    const c01 = this.idx(i, j + 1, k);
    const c11 = this.idx(i + 1, j + 1, k);
    const c02 = this.idx(i, j, k + 1);
    const c12 = this.idx(i + 1, j, k + 1);
    const c03 = this.idx(i, j + 1, k + 1);
    const c13 = this.idx(i + 1, j + 1, k + 1);

    const interp = (arr) => {
      const a = arr[c00] * (1 - tx) + arr[c10] * tx;
      const b = arr[c01] * (1 - tx) + arr[c11] * tx;
      const c = arr[c02] * (1 - tx) + arr[c12] * tx;
      const d = arr[c03] * (1 - tx) + arr[c13] * tx;
      const e = a * (1 - ty) + b * ty;
      const f = c * (1 - ty) + d * ty;
      return e * (1 - tz) + f * tz;
    };

    return [interp(this.u), interp(this.v), interp(this.w)];
  }

  getObstacleInfoAt(wx, wy, wz) {
    const fx = (wx - this.domainMin.x) / (this.domainMax.x - this.domainMin.x) * (this.nx - 1);
    const fy = (wy - this.domainMin.y) / (this.domainMax.y - this.domainMin.y) * (this.ny - 1);
    const fz = (wz - this.domainMin.z) / (this.domainMax.z - this.domainMin.z) * (this.nz - 1);

    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.ny - 2, Math.floor(fy)));
    const k = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));

    const tx = fx - i;
    const ty = fy - j;
    const tz = fz - k;

    const c00 = this.idx(i, j, k);
    const c10 = this.idx(i + 1, j, k);
    const c01 = this.idx(i, j + 1, k);
    const c11 = this.idx(i + 1, j + 1, k);
    const c02 = this.idx(i, j, k + 1);
    const c12 = this.idx(i + 1, j, k + 1);
    const c03 = this.idx(i, j + 1, k + 1);
    const c13 = this.idx(i + 1, j + 1, k + 1);

    const interp = (arr) => {
      const a = arr[c00] * (1 - tx) + arr[c10] * tx;
      const b = arr[c01] * (1 - tx) + arr[c11] * tx;
      const c = arr[c02] * (1 - tx) + arr[c12] * tx;
      const d = arr[c03] * (1 - tx) + arr[c13] * tx;
      const e = a * (1 - ty) + b * ty;
      const f = c * (1 - ty) + d * ty;
      return e * (1 - tz) + f * tz;
    };

    const dist = interp(this.obstacleDist);
    const nx = interp(this.obstacleNormalX);
    const ny = interp(this.obstacleNormalY);
    const nz = interp(this.obstacleNormalZ);

    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-8;

    return {
      distance: dist,
      normal: [nx / nLen, ny / nLen, nz / nLen]
    };
  }
}

class WindParticles {
  constructor(solver, config) {
    this.solver = solver;
    this.numParticles = config.numParticles || 800;
    this.maxTrailLength = config.maxTrailLength || 35;

    this.positions = new Float32Array(this.numParticles * 3);
    this.positionsPrev = new Float32Array(this.numParticles * 3);
    this.velocities = new Float32Array(this.numParticles * 3);

    this.trailRing = new Float32Array(this.numParticles * this.maxTrailLength * 3);
    this.trailIndex = new Uint32Array(this.numParticles);
    this.trailCount = new Uint32Array(this.numParticles);

    this.alive = new Uint8Array(this.numParticles);
    this.spawnTimer = new Float32Array(this.numParticles);

    this.maxSegments = this.numParticles * this.maxTrailLength;
    this.linePositions = new Float32Array(this.maxSegments * 6);
    this.lineColors = new Float32Array(this.maxSegments * 6);

    this.domainMin = solver.domainMin;
    this.domainMax = solver.domainMax;

    this._colorCacheR = new Float32Array(256);
    this._colorCacheG = new Float32Array(256);
    this._colorCacheB = new Float32Array(256);
    this._buildColorCache();

    this.init();
  }

  _buildColorCache() {
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const hue = 0.58 - t * 0.52;
      const s = 1.0;
      const l = 0.35 + t * 0.35;

      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
      const m = l - c / 2;

      let r, g, b;
      if (hue < 1 / 6) { r = c; g = x; b = 0; }
      else if (hue < 2 / 6) { r = x; g = c; b = 0; }
      else if (hue < 3 / 6) { r = 0; g = c; b = x; }
      else if (hue < 4 / 6) { r = 0; g = x; b = c; }
      else if (hue < 5 / 6) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      this._colorCacheR[i] = r + m;
      this._colorCacheG[i] = g + m;
      this._colorCacheB[i] = b + m;
    }
  }

  _getColor(speed, alpha) {
    const speedNorm = Math.min(speed / 12, 1);
    const idx = Math.floor(speedNorm * 255);
    return [
      this._colorCacheR[idx] * alpha,
      this._colorCacheG[idx] * alpha,
      this._colorCacheB[idx] * alpha
    ];
  }

  init() {
    for (let p = 0; p < this.numParticles; p++) {
      this.resetParticle(p);
      this.alive[p] = Math.random() > 0.4 ? 1 : 0;
      this.spawnTimer[p] = Math.random() * 3;
      this.trailIndex[p] = 0;
      this.trailCount[p] = 0;
    }
  }

  resetParticle(p) {
    const x = this.domainMin.x + 3 + Math.random() * 15;
    const yRange = this.domainMax.y - this.domainMin.y;
    const zRange = this.domainMax.z - this.domainMin.z;
    const y = this.domainMin.y + 12 + Math.random() * (yRange - 24);
    const z = this.domainMin.z + 5 + Math.random() * (zRange - 10);

    const idx = p * 3;
    this.positions[idx] = x;
    this.positions[idx + 1] = y;
    this.positions[idx + 2] = z;

    this.positionsPrev[idx] = x;
    this.positionsPrev[idx + 1] = y;
    this.positionsPrev[idx + 2] = z;

    this.velocities[idx] = 0;
    this.velocities[idx + 1] = 0;
    this.velocities[idx + 2] = 0;

    this.trailIndex[p] = 0;
    this.trailCount[p] = 0;
    this.alive[p] = 1;
  }

  update(dt) {
    const solver = this.solver;
    const nx = solver.nx, ny = solver.ny, nz = solver.nz;
    const invDt = 1 / dt;

    for (let p = 0; p < this.numParticles; p++) {
      if (!this.alive[p]) {
        this.spawnTimer[p] -= dt;
        if (this.spawnTimer[p] <= 0) {
          this.resetParticle(p);
          this.spawnTimer[p] = 0.5 + Math.random() * 2;
        } else {
          continue;
        }
      }

      const idx = p * 3;
      let px = this.positions[idx];
      let py = this.positions[idx + 1];
      let pz = this.positions[idx + 2];

      const fx = (px - solver.domainMin.x) / (solver.domainMax.x - solver.domainMin.x) * (nx - 1);
      const fy = (py - solver.domainMin.y) / (solver.domainMax.y - solver.domainMin.y) * (ny - 1);
      const fz = (pz - solver.domainMin.z) / (solver.domainMax.z - solver.domainMin.z) * (nz - 1);

      const gi = Math.max(0, Math.min(nx - 1, Math.floor(fx)));
      const gj = Math.max(0, Math.min(ny - 1, Math.floor(fy)));
      const gk = Math.max(0, Math.min(nz - 1, Math.floor(fz)));

      const gIdx = solver.idx(gi, gj, gk);

      if (gi < 1 || gi >= nx - 2 ||
          gj < 1 || gj >= ny - 2 ||
          gk < 1 || gk >= nz - 2) {
        this.resetParticle(p);
        this.spawnTimer[p] = 0.2 + Math.random();
        continue;
      }

      if (solver.obstacle[gIdx]) {
        const obsInfo = solver.getObstacleInfoAt(px, py, pz);
        if (obsInfo.distance < 0.5) {
          const normal = obsInfo.normal;
          const pushDist = 1.5;
          px += normal[0] * pushDist;
          py += normal[1] * pushDist;
          pz += normal[2] * pushDist;
          this.positions[idx] = px;
          this.positions[idx + 1] = py;
          this.positions[idx + 2] = pz;

          const velIdx = p * 3;
          const dot = this.velocities[velIdx] * normal[0] +
                      this.velocities[velIdx + 1] * normal[1] +
                      this.velocities[velIdx + 2] * normal[2];
          if (dot < 0) {
            this.velocities[velIdx] -= dot * normal[0];
            this.velocities[velIdx + 1] -= dot * normal[1];
            this.velocities[velIdx + 2] -= dot * normal[2];
          }

          this.trailIndex[p] = 0;
          this.trailCount[p] = 0;
        }
        continue;
      }

      let vx = solver.u[gIdx];
      let vy = solver.v[gIdx];
      let vz = solver.w[gIdx];

      const obsInfo = solver.getObstacleInfoAt(px, py, pz);
      if (obsInfo.distance < 3) {
        const normal = obsInfo.normal;
        const dot = vx * normal[0] + vy * normal[1] + vz * normal[2];
        const falloff = Math.max(0, 1.0 - obsInfo.distance / 3);
        vx -= dot * normal[0] * falloff;
        vy -= dot * normal[1] * falloff;
        vz -= dot * normal[2] * falloff;

        const tangentX = -normal[1];
        const tangentY = normal[0];
        const tangentZ = 0;
        const tLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ) + 1e-8;
        const slideSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz) * falloff;
        vx += (tangentX / tLen) * slideSpeed * 0.5;
        vy += (tangentY / tLen) * slideSpeed * 0.5;
        vz += (tangentZ / tLen) * slideSpeed * 0.3;
      }

      const velIdx = p * 3;
      this.velocities[velIdx] = vx;
      this.velocities[velIdx + 1] = vy;
      this.velocities[velIdx + 2] = vz;

      this.positionsPrev[idx] = px;
      this.positionsPrev[idx + 1] = py;
      this.positionsPrev[idx + 2] = pz;

      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;

      const newFx = (px - solver.domainMin.x) / (solver.domainMax.x - solver.domainMin.x) * (nx - 1);
      const newFy = (py - solver.domainMin.y) / (solver.domainMax.y - solver.domainMin.y) * (ny - 1);
      const newFz = (pz - solver.domainMin.z) / (solver.domainMax.z - solver.domainMin.z) * (nz - 1);

      const newGi = Math.max(0, Math.min(nx - 1, Math.floor(newFx)));
      const newGj = Math.max(0, Math.min(ny - 1, Math.floor(newFy)));
      const newGk = Math.max(0, Math.min(nz - 1, Math.floor(newFz)));
      const newGIdx = solver.idx(newGi, newGj, newGk);

      if (solver.obstacle[newGIdx]) {
        const obsInfo2 = solver.getObstacleInfoAt(px, py, pz);
        if (obsInfo2.distance < 1) {
          const normal = obsInfo2.normal;
          const pushDist = 1.2;
          px = this.positionsPrev[idx] + normal[0] * pushDist;
          py = this.positionsPrev[idx + 1] + normal[1] * pushDist;
          pz = this.positionsPrev[idx + 2] + normal[2] * pushDist;
        }
      }

      if (px > solver.domainMax.x - 2 ||
          py > solver.domainMax.y - 2 ||
          py < solver.domainMin.y + 2 ||
          pz > solver.domainMax.z - 2 ||
          pz < solver.domainMin.z + 2) {
        this.resetParticle(p);
        this.spawnTimer[p] = 0.3 + Math.random();
        continue;
      }

      this.positions[idx] = px;
      this.positions[idx + 1] = py;
      this.positions[idx + 2] = pz;

      const tIdx = p * this.maxTrailLength * 3 + this.trailIndex[p] * 3;
      this.trailRing[tIdx] = px;
      this.trailRing[tIdx + 1] = py;
      this.trailRing[tIdx + 2] = pz;
      this.trailIndex[p] = (this.trailIndex[p] + 1) % this.maxTrailLength;
      if (this.trailCount[p] < this.maxTrailLength) {
        this.trailCount[p]++;
      }
    }
  }

  fillLineBuffers() {
    const solver = this.solver;
    let segCount = 0;

    for (let p = 0; p < this.numParticles; p++) {
      if (!this.alive[p]) continue;
      const count = this.trailCount[p];
      if (count < 2) continue;

      const currentPos = [
        this.positions[p * 3],
        this.positions[p * 3 + 1],
        this.positions[p * 3 + 2]
      ];

      const vx = this.velocities[p * 3];
      const vy = this.velocities[p * 3 + 1];
      const vz = this.velocities[p * 3 + 2];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

      const headIdx = this.trailIndex[p];
      const baseIdx = p * this.maxTrailLength * 3;

      for (let i = 0; i < count - 1 && segCount < this.maxSegments; i++) {
        const i0 = (headIdx - 1 - i + this.maxTrailLength) % this.maxTrailLength;
        const i1 = (headIdx - 2 - i + this.maxTrailLength) % this.maxTrailLength;

        const fromIdx = baseIdx + i1 * 3;
        const toIdx = baseIdx + i0 * 3;

        const fromX = this.trailRing[fromIdx];
        const fromY = this.trailRing[fromIdx + 1];
        const fromZ = this.trailRing[fromIdx + 2];
        const toX = this.trailRing[toIdx];
        const toY = this.trailRing[toIdx + 1];
        const toZ = this.trailRing[toIdx + 2];

        const alpha = (1 - i / count) * 0.9;
        const color = this._getColor(speed * (1 - i / count * 0.3), alpha);

        const segIdx = segCount * 6;
        this.linePositions[segIdx] = fromX;
        this.linePositions[segIdx + 1] = fromY;
        this.linePositions[segIdx + 2] = fromZ;
        this.linePositions[segIdx + 3] = toX;
        this.linePositions[segIdx + 4] = toY;
        this.linePositions[segIdx + 5] = toZ;

        this.lineColors[segIdx] = color[0];
        this.lineColors[segIdx + 1] = color[1];
        this.lineColors[segIdx + 2] = color[2];
        this.lineColors[segIdx + 3] = color[0] * 1.1;
        this.lineColors[segIdx + 4] = color[1] * 1.1;
        this.lineColors[segIdx + 5] = color[2] * 1.1;

        segCount++;
      }
    }

    return segCount;
  }

  getLineData() {
    const count = this.fillLineBuffers();
    return {
      positions: this.linePositions,
      colors: this.lineColors,
      count: count
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FluidSolver3D, WindParticles };
}
