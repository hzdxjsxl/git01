class FluidSolver3D {
  constructor(config) {
    this.nx = config.nx;
    this.ny = config.ny;
    this.nz = config.nz;
    this.dx = config.cellSize || 1.0;
    this.dt = config.dt || 0.12;
    this.viscosity = config.viscosity || 0.00005;
    this.windDir = config.windDir || [1, 0, 0];
    this.windSpeed = config.windSpeed || 6.0;
    this.size = this.nx * this.ny * this.nz;

    this.u = new Float32Array(this.size);
    this.v = new Float32Array(this.size);
    this.w = new Float32Array(this.size);

    this.uPrev = new Float32Array(this.size);
    this.vPrev = new Float32Array(this.size);
    this.wPrev = new Float32Array(this.size);

    this.p = new Float32Array(this.size);
    this.div = new Float32Array(this.size);

    this.obstacle = new Uint8Array(this.size);

    this.bounds = config.bounds || {
      minX: -60, maxX: 60,
      minY: -20, maxY: 220,
      minZ: -30, maxZ: 30
    };

    this.domainMin = { x: this.bounds.minX - 40, y: this.bounds.minY - 10, z: this.bounds.minZ - 40 };
    this.domainMax = { x: this.bounds.maxX + 40, y: this.bounds.maxY + 30, z: this.bounds.maxZ + 40 };
  }

  idx(i, j, k) {
    return i + this.nx * (j + this.ny * k);
  }

  worldToGrid(wx, wy, wz) {
    const i = Math.floor((wx - this.domainMin.x) / (this.domainMax.x - this.domainMin.x) * (this.nx - 1));
    const j = Math.floor((wy - this.domainMin.y) / (this.domainMax.y - this.domainMin.y) * (this.ny - 1));
    const k = Math.floor((wz - this.domainMin.z) / (this.domainMax.z - this.domainMin.z) * (this.nz - 1));
    return [
      Math.max(0, Math.min(this.nx - 1, i)),
      Math.max(0, Math.min(this.ny - 1, j)),
      Math.max(0, Math.min(this.nz - 1, k))
    ];
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
    const vertArr = vertices;

    const boxes = [];
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
      boxes.push({ minX, minY, minZ, maxX, maxY, maxZ });
    }

    const margin = 0.5;
    for (let k = 0; k < this.nz; k++) {
      for (let j = 0; j < this.ny; j++) {
        for (let i = 0; i < this.nx; i++) {
          const [wx, wy, wz] = this.gridToWorld(i, j, k);
          for (const box of boxes) {
            if (wx >= box.minX - margin && wx <= box.maxX + margin &&
                wy >= box.minY - margin && wy <= box.maxY + margin &&
                wz >= box.minZ - margin && wz <= box.maxZ + margin) {
              this.obstacle[this.idx(i, j, k)] = 1;
              break;
            }
          }
        }
      }
    }
  }

  mergeBoxes(boxes) {
    const merged = [];
    const used = new Array(boxes.length).fill(false);
    for (let i = 0; i < boxes.length; i++) {
      if (used[i]) continue;
      let cur = { ...boxes[i] };
      for (let j = i + 1; j < boxes.length; j++) {
        if (used[j]) continue;
        const other = boxes[j];
        if (cur.maxX === other.minX && cur.minX <= other.minX && cur.maxX >= other.minX &&
            cur.maxY >= other.minY && cur.minY <= other.maxY &&
            cur.maxZ >= other.minZ && cur.minZ <= other.maxZ) {
          cur.maxX = other.maxX;
          cur.minX = Math.min(cur.minX, other.minX);
          cur.minY = Math.min(cur.minY, other.minY);
          cur.maxY = Math.max(cur.maxY, other.maxY);
          cur.minZ = Math.min(cur.minZ, other.minZ);
          cur.maxZ = Math.max(cur.maxZ, other.maxZ);
          used[j] = true;
        }
      }
      used[i] = true;
      merged.push(cur);
    }
    return merged;
  }

  step() {
    this.addWind();
    this.advect(this.u, this.uPrev);
    this.advect(this.v, this.vPrev);
    this.advect(this.w, this.wPrev);
    this.diffuse(this.u, this.uPrev);
    this.diffuse(this.v, this.vPrev);
    this.diffuse(this.w, this.wPrev);
    this.project();
    this.enforceObstacles();
    this.enforceBoundaries();
  }

  addWind() {
    const margin = 3;
    const dir = this.windDir;
    const speed = this.windSpeed;
    for (let k = 0; k < this.nz; k++) {
      for (let j = 0; j < this.ny; j++) {
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

          const x = i - dt * this.u[idx] / dx;
          const y = j - dt * this.v[idx] / dx;
          const z = k - dt * this.w[idx] / dx;

          const i0 = Math.max(0, Math.min(nx - 1, Math.floor(x)));
          const j0 = Math.max(0, Math.min(ny - 1, Math.floor(y)));
          const k0 = Math.max(0, Math.min(nz - 1, Math.floor(z)));
          const i1 = Math.min(nx - 1, i0 + 1);
          const j1 = Math.min(ny - 1, j0 + 1);
          const k1 = Math.min(nz - 1, k0 + 1);

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
    const nx = this.nx, ny = this.ny, nz = this.nz;

    for (let iter = 0; iter < 4; iter++) {
      for (let k = 1; k < nz - 1; k++) {
        for (let j = 1; j < ny - 1; j++) {
          for (let i = 1; i < nx - 1; i++) {
            const idx = this.idx(i, j, k);
            if (this.obstacle[idx]) continue;
            field[idx] = (prevField[idx] + a * (
              field[this.idx(i - 1, j, k)] + field[this.idx(i + 1, j, k)] +
              field[this.idx(i, j - 1, k)] + field[this.idx(i, j + 1, k)] +
              field[this.idx(i, j, k - 1)] + field[this.idx(i, j, k + 1)]
            )) / c;
          }
        }
      }
    }
  }

  project() {
    const h = this.dx;
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
          ) / (2 * h);
          this.p[idx] = 0;
        }
      }
    }

    for (let iter = 0; iter < 25; iter++) {
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
            ) / 6;
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
          this.u[idx] -= dt * (this.p[this.idx(i + 1, j, k)] - this.p[this.idx(i - 1, j, k)]) / (2 * h);
          this.v[idx] -= dt * (this.p[this.idx(i, j + 1, k)] - this.p[this.idx(i, j - 1, k)]) / (2 * h);
          this.w[idx] -= dt * (this.p[this.idx(i, j, k + 1)] - this.p[this.idx(i, j, k - 1)]) / (2 * h);
        }
      }
    }
  }

  enforceObstacles() {
    for (let idx = 0; idx < this.size; idx++) {
      if (this.obstacle[idx]) {
        this.u[idx] = 0;
        this.v[idx] = 0;
        this.w[idx] = 0;
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
}

class WindParticles {
  constructor(solver, config) {
    this.solver = solver;
    this.numParticles = config.numParticles || 600;
    this.maxTrailLength = config.maxTrailLength || 30;
    this.positions = new Float32Array(this.numParticles * 3);
    this.trails = [];
    this.alive = new Uint8Array(this.numParticles);

    this.bounds = solver.bounds;
    this.domainMin = solver.domainMin;
    this.domainMax = solver.domainMax;

    this.init();
  }

  init() {
    for (let p = 0; p < this.numParticles; p++) {
      this.resetParticle(p);
      this.alive[p] = Math.random() > 0.5 ? 1 : 0;
    }
  }

  resetParticle(p) {
    const margin = 5;
    const x = this.domainMin.x + margin + Math.random() * 10;
    const yRange = this.domainMax.y - this.domainMin.y;
    const zRange = this.domainMax.z - this.domainMin.z;
    const y = this.domainMin.y + 10 + Math.random() * (yRange - 20);
    const z = this.domainMin.z + 5 + Math.random() * (zRange - 10);

    const idx = p * 3;
    this.positions[idx] = x;
    this.positions[idx + 1] = y;
    this.positions[idx + 2] = z;

    this.trails[p] = [];
    this.alive[p] = 1;
  }

  update(dt) {
    const solver = this.solver;
    for (let p = 0; p < this.numParticles; p++) {
      if (!this.alive[p]) {
        if (Math.random() < 0.02) {
          this.resetParticle(p);
        } else {
          continue;
        }
      }

      const idx = p * 3;
      const px = this.positions[idx];
      const py = this.positions[idx + 1];
      const pz = this.positions[idx + 2];

      const fx = (px - solver.domainMin.x) / (solver.domainMax.x - solver.domainMin.x) * (solver.nx - 1);
      const fy = (py - solver.domainMin.y) / (solver.domainMax.y - solver.domainMin.y) * (solver.ny - 1);
      const fz = (pz - solver.domainMin.z) / (solver.domainMax.z - solver.domainMin.z) * (solver.nz - 1);

      const gi = Math.floor(fx);
      const gj = Math.floor(fy);
      const gk = Math.floor(fz);

      if (gi < 1 || gi >= solver.nx - 2 ||
          gj < 1 || gj >= solver.ny - 2 ||
          gk < 1 || gk >= solver.nz - 2) {
        this.resetParticle(p);
        continue;
      }

      const gIdx = solver.idx(gi, gj, gk);
      if (solver.obstacle[gIdx]) {
        this.resetParticle(p);
        continue;
      }

      this.trails[p].push([px, py, pz]);
      if (this.trails[p].length > this.maxTrailLength) {
        this.trails[p].shift();
      }

      const vx = solver.u[gIdx];
      const vy = solver.v[gIdx];
      const vz = solver.w[gIdx];

      this.positions[idx] = px + vx * dt;
      this.positions[idx + 1] = py + vy * dt;
      this.positions[idx + 2] = pz + vz * dt;

      if (this.positions[idx] > solver.domainMax.x - 2 ||
          this.positions[idx + 1] > solver.domainMax.y - 2 ||
          this.positions[idx + 1] < solver.domainMin.y + 2 ||
          this.positions[idx + 2] > solver.domainMax.z - 2 ||
          this.positions[idx + 2] < solver.domainMin.z + 2) {
        this.resetParticle(p);
      }
    }
  }

  getLineSegments() {
    const segments = [];
    for (let p = 0; p < this.numParticles; p++) {
      if (!this.alive[p]) continue;
      const trail = this.trails[p];
      if (trail.length < 2) continue;

      const currentPos = [
        this.positions[p * 3],
        this.positions[p * 3 + 1],
        this.positions[p * 3 + 2]
      ];

      const speed = this.solver.getVelocityAt(currentPos[0], currentPos[1], currentPos[2]);

      const allPoints = [...trail, currentPos];

      for (let i = 1; i < allPoints.length; i++) {
        const prev = allPoints[i - 1];
        const curr = allPoints[i];
        const alpha = i / allPoints.length;
        segments.push({
          from: prev,
          to: curr,
          alpha: alpha * 0.8 + 0.1,
          speed: speed
        });
      }
    }
    return segments;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FluidSolver3D, WindParticles };
}
