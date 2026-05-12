class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  mulScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.mulScalar(1 / len);
    }
    return this;
  }

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  static sub(a, b) {
    return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static add(a, b) {
    return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a, b) {
    return new Vec3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }
}

class Particle {
  constructor(x, y, z, mass = 1, pinned = false) {
    this.position = new Vec3(x, y, z);
    this.prevPosition = new Vec3(x, y, z);
    this.acceleration = new Vec3(0, 0, 0);
    this.mass = mass;
    this.pinned = pinned;
  }

  applyForce(force) {
    if (!this.pinned) {
      this.acceleration.add(force.clone().mulScalar(1 / this.mass));
    }
  }

  integrate(dt, damping) {
    if (this.pinned) return;

    const velocity = Vec3.sub(this.position, this.prevPosition);
    velocity.mulScalar(damping);

    const newPos = this.position.clone()
      .add(velocity)
      .add(this.acceleration.clone().mulScalar(dt * dt));

    this.prevPosition.copy(this.position);
    this.position.copy(newPos);
    this.acceleration = new Vec3(0, 0, 0);
  }
}

class Spring {
  constructor(p1, p2, restLength, stiffness = 1.0) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLength = restLength;
    this.stiffness = stiffness;
  }

  satisfy() {
    const delta = Vec3.sub(this.p2.position, this.p1.position);
    const currentLength = delta.length();

    if (currentLength === 0) return;

    const diff = (currentLength - this.restLength) / currentLength;
    const correction = delta.clone().mulScalar(diff * 0.5 * this.stiffness);

    if (!this.p1.pinned) {
      this.p1.position.add(correction);
    }
    if (!this.p2.pinned) {
      this.p2.position.sub(correction);
    }
  }
}

class ClothPhysics {
  constructor(config = {}) {
    this.config = {
      width: 4,
      height: 3,
      segmentsX: 40,
      segmentsY: 30,
      gravity: new Vec3(0, -9.8, 0),
      damping: 0.98,
      stiffness: 1.0,
      iterations: 5,
      windStrength: 5,
      windFrequency: 2,
      ...config
    };

    this.particles = [];
    this.springs = [];
    this.time = 0;

    this.init();
  }

  init() {
    const { width, height, segmentsX, segmentsY, stiffness } = this.config;

    const dx = width / segmentsX;
    const dy = height / segmentsY;

    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const x = i * dx - width / 2;
        const y = height / 2 - j * dy;
        const z = 0;

        const pinned = j === 0;
        const particle = new Particle(x, y, z, 0.1, pinned);
        this.particles.push(particle);
      }
    }

    const getIndex = (i, j) => j * (segmentsX + 1) + i;

    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const p = this.particles[getIndex(i, j)];

        if (i < segmentsX) {
          const pRight = this.particles[getIndex(i + 1, j)];
          this.springs.push(new Spring(p, pRight, dx, stiffness));
        }

        if (j < segmentsY) {
          const pDown = this.particles[getIndex(i, j + 1)];
          this.springs.push(new Spring(p, pDown, dy, stiffness));
        }

        if (i < segmentsX && j < segmentsY) {
          const pDiag = this.particles[getIndex(i + 1, j + 1)];
          const restLen = Math.sqrt(dx * dx + dy * dy);
          this.springs.push(new Spring(p, pDiag, restLen, stiffness * 0.7));

          const pOther = this.particles[getIndex(i, j + 1)];
          const pOther2 = this.particles[getIndex(i + 1, j)];
          this.springs.push(new Spring(pOther, pOther2, restLen, stiffness * 0.7));
        }

        if (i < segmentsX - 1) {
          const pRight2 = this.particles[getIndex(i + 2, j)];
          this.springs.push(new Spring(p, pRight2, dx * 2, stiffness * 0.5));
        }

        if (j < segmentsY - 1) {
          const pDown2 = this.particles[getIndex(i, j + 2)];
          this.springs.push(new Spring(p, pDown2, dy * 2, stiffness * 0.5));
        }
      }
    }
  }

  calculateWindForce(particle, time) {
    const { windStrength, windFrequency } = this.config;

    const noiseX = Math.sin(particle.position.x * 0.5 + time * windFrequency) * 0.5 + 0.5;
    const noiseY = Math.cos(particle.position.y * 0.3 + time * windFrequency * 1.3) * 0.5 + 0.5;
    const noiseZ = Math.sin(time * windFrequency * 0.7 + particle.position.x * 0.2) * 0.5 + 0.5;

    const baseForce = new Vec3(
      1.5 + noiseX * 1.5,
      noiseY * 0.3,
      0.8 + noiseZ * 1.0
    );

    const positionFactor = 0.3 + (particle.position.y / this.config.height) * 0.7;
    baseForce.mulScalar(windStrength * positionFactor * 0.1);

    return baseForce;
  }

  update(dt) {
    const { gravity, damping, iterations } = this.config;
    this.time += dt;

    for (const particle of this.particles) {
      particle.applyForce(gravity.clone().mulScalar(particle.mass));

      const windForce = this.calculateWindForce(particle, this.time);
      particle.applyForce(windForce);
    }

    for (const particle of this.particles) {
      particle.integrate(dt, damping);
    }

    for (let i = 0; i < iterations; i++) {
      for (const spring of this.springs) {
        spring.satisfy();
      }
    }
  }

  getParticles() {
    return this.particles;
  }

  setWindStrength(value) {
    this.config.windStrength = value;
  }

  setWindFrequency(value) {
    this.config.windFrequency = value;
  }
}

export { ClothPhysics, Vec3 };
