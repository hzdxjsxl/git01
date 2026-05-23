import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GravitySystem } from './physics.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
);
camera.position.set(0, 80, 180);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight(0x333333, 1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffeecc, 3, 2000);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const starsGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const r = 800 + Math.random() * 1200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: true });
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

const gravity = new GravitySystem();

const planetData = [
    { mass: 3000, radius: 10, color: 0xffcc33, pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(0, 0, 0), emissive: 0x664400 },
    { mass: 15,   radius: 2.8, color: 0x4fc3f7, pos: new THREE.Vector3(50, 0, 0),  vel: new THREE.Vector3(0, 0, 22),  emissive: 0x001122 },
    { mass: 8,    radius: 2.0, color: 0x81c784, pos: new THREE.Vector3(-80, 0, 0), vel: new THREE.Vector3(0, 0, -17), emissive: 0x002200 },
    { mass: 25,   radius: 4.0, color: 0xba68c8, pos: new THREE.Vector3(0, 0, 120),  vel: new THREE.Vector3(-14, 0, 0), emissive: 0x220033 },
    { mass: 5,    radius: 1.6, color: 0xff8a65, pos: new THREE.Vector3(0, 0, -160), vel: new THREE.Vector3(12, 0, 0),  emissive: 0x331100 },
    { mass: 12,   radius: 2.4, color: 0xffd54f, pos: new THREE.Vector3(200, 0, 0), vel: new THREE.Vector3(0, 0, -11), emissive: 0x332200 }
];

const meshes = [];

for (const data of planetData) {
    const body = gravity.addBody(data.mass, data.pos, data.vel, new THREE.Color(data.color));

    const geometry = new THREE.SphereGeometry(data.radius, 48, 48);
    const material = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.emissive,
        emissiveIntensity: 0.5,
        roughness: 0.6,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(body.position);
    scene.add(mesh);

    if (data.mass >= 3000) {
        const glowGeom = new THREE.SphereGeometry(data.radius * 1.4, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        mesh.add(glow);
    }

    meshes.push(mesh);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const FIXED_DT = 1 / 60;
let accumulator = 0;

function animate() {
    requestAnimationFrame(animate);

    const frameDt = clock.getDelta();
    accumulator += Math.min(frameDt, 0.1);

    while (accumulator >= FIXED_DT) {
        gravity.step(FIXED_DT);
        accumulator -= FIXED_DT;
    }

    const alpha = accumulator / FIXED_DT;
    for (let i = 0; i < gravity.bodies.length; i++) {
        const body = gravity.bodies[i];
        const mesh = meshes[i];
        mesh.position.x = body.position.x + body.velocity.x * FIXED_DT * alpha;
        mesh.position.y = body.position.y + body.velocity.y * FIXED_DT * alpha;
        mesh.position.z = body.position.z + body.velocity.z * FIXED_DT * alpha;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();
