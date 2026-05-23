class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

const G = 50.0;
const SOFTENING = 3.0;
const MAX_SPEED = 200.0;

class Body {
    constructor(mass, position, velocity, color) {
        this.mass = mass;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.acceleration = new Vec3();
        this.prevAcceleration = null;
        this.color = color || 0xffffff;
    }
}

class GravitySystem {
    constructor() {
        this.bodies = [];
    }

    addBody(mass, position, velocity, color) {
        const body = new Body(mass, position, velocity, color);
        this.bodies.push(body);
        return body;
    }

    computeAccelerations() {
        const n = this.bodies.length;
        for (let i = 0; i < n; i++) {
            this.bodies[i].acceleration.set(0, 0, 0);
        }

        for (let i = 0; i < n; i++) {
            const a = this.bodies[i];
            for (let j = i + 1; j < n; j++) {
                const b = this.bodies[j];
                const dx = b.position.x - a.position.x;
                const dy = b.position.y - a.position.y;
                const dz = b.position.z - a.position.z;
                const r2 = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
                const r = Math.sqrt(r2);
                const invR3 = 1.0 / (r2 * r);

                const fx = G * dx * invR3;
                const fy = G * dy * invR3;
                const fz = G * dz * invR3;

                a.acceleration.x += fx * b.mass;
                a.acceleration.y += fy * b.mass;
                a.acceleration.z += fz * b.mass;

                b.acceleration.x -= fx * a.mass;
                b.acceleration.y -= fy * a.mass;
                b.acceleration.z -= fz * a.mass;
            }
        }
    }

    step(dt) {
        if (this.bodies[0].prevAcceleration === null) {
            this.computeAccelerations();
            for (const body of this.bodies) {
                body.prevAcceleration = body.acceleration.clone();
            }
        }

        for (const body of this.bodies) {
            body.position.x += body.velocity.x * dt + 0.5 * body.prevAcceleration.x * dt * dt;
            body.position.y += body.velocity.y * dt + 0.5 * body.prevAcceleration.y * dt * dt;
            body.position.z += body.velocity.z * dt + 0.5 * body.prevAcceleration.z * dt * dt;
        }

        this.computeAccelerations();

        for (const body of this.bodies) {
            body.velocity.x += 0.5 * (body.prevAcceleration.x + body.acceleration.x) * dt;
            body.velocity.y += 0.5 * (body.prevAcceleration.y + body.acceleration.y) * dt;
            body.velocity.z += 0.5 * (body.prevAcceleration.z + body.acceleration.z) * dt;

            const speed = Math.sqrt(
                body.velocity.x * body.velocity.x +
                body.velocity.y * body.velocity.y +
                body.velocity.z * body.velocity.z
            );
            if (speed > MAX_SPEED) {
                const scale = MAX_SPEED / speed;
                body.velocity.x *= scale;
                body.velocity.y *= scale;
                body.velocity.z *= scale;
            }

            body.prevAcceleration.copy(body.acceleration);
        }
    }

    computeTotalEnergy() {
        let ke = 0;
        for (const body of this.bodies) {
            const v2 = body.velocity.x * body.velocity.x
                      + body.velocity.y * body.velocity.y
                      + body.velocity.z * body.velocity.z;
            ke += 0.5 * body.mass * v2;
        }

        let pe = 0;
        const n = this.bodies.length;
        for (let i = 0; i < n; i++) {
            const a = this.bodies[i];
            for (let j = i + 1; j < n; j++) {
                const b = this.bodies[j];
                const dx = b.position.x - a.position.x;
                const dy = b.position.y - a.position.y;
                const dz = b.position.z - a.position.z;
                const r2 = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
                const r = Math.sqrt(r2);
                pe -= G * a.mass * b.mass / r;
            }
        }

        return ke + pe;
    }
}

export { Body, GravitySystem };

if (typeof window === 'undefined') {
    const G_TEST = 50.0;
    const EPS_TEST = 3.0;
    const DT_TEST = 1 / 60;
    const NSTEPS = 5000;

    const bodies = [
        { m: 3000, p: [0, 0, 0],       v: [0, 0, 0]   },
        { m: 15,   p: [50, 0, 0],      v: [0, 0, 22]  },
        { m: 8,    p: [-80, 0, 0],     v: [0, 0, -17] },
        { m: 25,   p: [0, 0, 120],     v: [-14, 0, 0] },
        { m: 5,    p: [0, 0, -160],    v: [12, 0, 0]  },
        { m: 12,   p: [200, 0, 0],     v: [0, 0, -11] }
    ].map(b => ({
        m: b.m,
        p: b.p.slice(),
        v: b.v.slice(),
        a: [0, 0, 0],
        aPrev: null
    }));

    function computeAccelerations(arr) {
        for (const b of arr) b.a = [0, 0, 0];
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i], b = arr[j];
                const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2];
                const r2 = dx * dx + dy * dy + dz * dz + EPS_TEST * EPS_TEST;
                const r = Math.sqrt(r2);
                const invR3 = 1 / (r2 * r);
                const fx = G_TEST * dx * invR3, fy = G_TEST * dy * invR3, fz = G_TEST * dz * invR3;
                a.a[0] += fx * b.m; a.a[1] += fy * b.m; a.a[2] += fz * b.m;
                b.a[0] -= fx * a.m; b.a[1] -= fy * a.m; b.a[2] -= fz * a.m;
            }
        }
    }

    function totalEnergy(arr) {
        let ke = 0, pe = 0;
        for (const b of arr) ke += 0.5 * b.m * (b.v[0] * b.v[0] + b.v[1] * b.v[1] + b.v[2] * b.v[2]);
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                const a = arr[i], b = arr[j];
                const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2];
                const r2 = dx * dx + dy * dy + dz * dz + EPS_TEST * EPS_TEST;
                pe -= G_TEST * a.m * b.m / Math.sqrt(r2);
            }
        }
        return ke + pe;
    }

    function stepVerlet(arr, dt) {
        if (arr[0].aPrev === null) {
            computeAccelerations(arr);
            for (const b of arr) b.aPrev = b.a.slice();
        }
        for (const b of arr) {
            b.p[0] += b.v[0] * dt + 0.5 * b.aPrev[0] * dt * dt;
            b.p[1] += b.v[1] * dt + 0.5 * b.aPrev[1] * dt * dt;
            b.p[2] += b.v[2] * dt + 0.5 * b.aPrev[2] * dt * dt;
        }
        computeAccelerations(arr);
        for (const b of arr) {
            b.v[0] += 0.5 * (b.aPrev[0] + b.a[0]) * dt;
            b.v[1] += 0.5 * (b.aPrev[1] + b.a[1]) * dt;
            b.v[2] += 0.5 * (b.aPrev[2] + b.a[2]) * dt;
            b.aPrev = b.a.slice();
        }
    }

    const e0 = totalEnergy(bodies);
    for (let i = 0; i < NSTEPS; i++) stepVerlet(bodies, DT_TEST);
    const e1 = totalEnergy(bodies);
    const drift = Math.abs((e1 - e0) / e0 * 100);

    console.log('=== GravitySystem Self-Test ===');
    console.log(`Steps:        ${NSTEPS}`);
    console.log(`Softening ε:  ${EPS_TEST}`);
    console.log(`Initial E:    ${e0.toFixed(4)}`);
    console.log(`Final E:      ${e1.toFixed(4)}`);
    console.log(`Energy drift: ${drift.toFixed(6)}%`);
    if (drift < 5.0) {
        console.log('PASS: Energy drift < 5%, integrator is stable.');
    } else {
        console.log('WARN: Energy drift >= 5%, check integrator and SOFTENING.');
    }
}
