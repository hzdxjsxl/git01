import * as THREE from 'three';

const G = 50.0;
const SOFTENING = 0.5;
const MAX_SPEED = 200.0;

class Body {
    constructor(mass, position, velocity, color) {
        this.mass = mass;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.acceleration = new THREE.Vector3();
        this.prevAcceleration = null;
        this.color = color || new THREE.Color(0xffffff);
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
}

export { Body, GravitySystem };
