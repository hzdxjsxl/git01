import * as THREE from 'three';
import { WindDataTexture } from './WindDataTexture.js';
import { WindShaders } from './WindShaders.js';

export class ParticleSystem {
    constructor(options = {}) {
        this.options = {
            container: options.container || document.body,
            particleCount: options.particleCount || 50000,
            particleSize: options.particleSize || 10.0,
            windSpeed: options.windSpeed || 5.0,
            globeRadius: options.globeRadius || 100,
            autoRotate: options.autoRotate !== false,
            rotationSpeed: options.rotationSpeed || 0.0002,
            backgroundColor: options.backgroundColor || 0x050510,
            colorHigh: options.colorHigh || new THREE.Color(0xffff00),
            colorLow: options.colorLow || new THREE.Color(0xff6600),
            fadeStart: options.fadeStart || 0.1,
            fadeEnd: options.fadeEnd || 0.9,
            resetProbability: options.resetProbability || 0.0002,
            maxWindSpeed: options.maxWindSpeed || 100.0
        };

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.windDataTexture = null;
        this.particleSystem = null;
        this.clock = null;
        this.rotationY = 0;
        this.animationId = null;
        this.isRunning = false;
        this.particlePositions = null;
        this.particleAges = null;
    }

    async init(windDataUrl) {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        await this.setupWindDataTexture(windDataUrl);
        this.setupParticleSystem();
        this.createGlobeMesh();
        this.setupControls();
        this.clock = new THREE.Clock();
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(this.options.backgroundColor, 1);
        this.options.container.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111122);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        this.camera.position.set(0, 0, this.options.globeRadius * 2.2);
        this.camera.lookAt(0, 0, 0);
    }

    async setupWindDataTexture(windDataUrl) {
        this.windDataTexture = new WindDataTexture(this.renderer);
        await this.windDataTexture.loadFromJSON(windDataUrl);
        
        const uvRange = this.windDataTexture.getUVRange();
        
        if (this.options.maxWindSpeed === 100.0) {
            this.options.maxWindSpeed = uvRange;
        }
    }

    setupParticleSystem() {
        const particleCount = this.options.particleCount;
        this.particlePositions = new Float32Array(particleCount * 3);
        this.particleUVs = new Float32Array(particleCount * 2);
        this.particleAges = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            this.particleUVs[i * 2] = Math.random();
            this.particleUVs[i * 2 + 1] = Math.random();
            this.particleAges[i] = Math.random() * 50;
            this.updateParticleWorldPosition(i);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffff00,
            size: this.options.particleSize,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);
    }

    updateParticleWorldPosition(index) {
        const uv = {
            x: this.particleUVs[index * 2],
            y: this.particleUVs[index * 2 + 1]
        };

        const lon = uv.x * 360 - 180;
        const lat = uv.y * 180 - 90;

        const lonRad = (lon * Math.PI) / 180;
        const latRad = (lat * Math.PI) / 180;

        const radius = this.options.globeRadius * 1.01;
        const idx = index * 3;

        this.particlePositions[idx] = radius * Math.cos(latRad) * Math.cos(lonRad);
        this.particlePositions[idx + 1] = radius * Math.sin(latRad);
        this.particlePositions[idx + 2] = radius * Math.cos(latRad) * Math.sin(lonRad);
    }

    sampleWindAtUV(uv) {
        const bounds = this.windDataTexture.getBounds();
        const dims = this.windDataTexture.getDimensions();

        const lon = uv.x * 360 - 180;
        const lat = uv.y * 180 - 90;

        const windU = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon);
        const windV = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

        const texX = windU * (dims.width - 1);
        const texY = windV * (dims.height - 1);

        const x0 = Math.floor(texX);
        const y0 = Math.floor(texY);
        const x1 = Math.min(x0 + 1, dims.width - 1);
        const y1 = Math.min(y0 + 1, dims.height - 1);

        const fx = texX - x0;
        const fy = texY - y0;

        const texture = this.windDataTexture.getTexture();
        const pixels = texture.image.data;

        const idx00 = (y0 * dims.width + x0) * 4;
        const idx10 = (y0 * dims.width + x1) * 4;
        const idx01 = (y1 * dims.width + x0) * 4;
        const idx11 = (y1 * dims.width + x1) * 4;

        const u00 = pixels[idx00];
        const u10 = pixels[idx10];
        const u01 = pixels[idx01];
        const u11 = pixels[idx11];

        const v00 = pixels[idx00 + 1];
        const v10 = pixels[idx10 + 1];
        const v01 = pixels[idx01 + 1];
        const v11 = pixels[idx11 + 1];

        const u = u00 * (1 - fx) * (1 - fy) + u10 * fx * (1 - fy) + u01 * (1 - fx) * fy + u11 * fx * fy;
        const v = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;

        return { u, v };
    }

    createGlobeMesh() {
        const innerGlobeGeometry = new THREE.SphereGeometry(this.options.globeRadius * 0.99, 32, 32);
        const innerGlobeMaterial = new THREE.MeshBasicMaterial({
            color: 0x223355,
            transparent: false,
            opacity: 1.0
        });
        const innerGlobe = new THREE.Mesh(innerGlobeGeometry, innerGlobeMaterial);
        this.scene.add(innerGlobe);

        const globeGeometry = new THREE.SphereGeometry(this.options.globeRadius, 48, 48);
        const globeMaterial = new THREE.MeshBasicMaterial({
            color: 0x66aaff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const globe = new THREE.Mesh(globeGeometry, globeMaterial);
        this.scene.add(globe);
    }

    setupControls() {
        if (typeof OrbitControls !== 'undefined') {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = this.options.globeRadius * 1.5;
            this.controls.maxDistance = this.options.globeRadius * 10;
        }
    }

    update() {
        const deltaTime = this.clock.getDelta();

        if (this.options.autoRotate && !this.controls) {
            this.rotationY += this.options.rotationSpeed * deltaTime * 60;
            this.particleSystem.rotation.y = this.rotationY;
        } else if (this.controls) {
            this.controls.update();
        }

        const particleCount = this.options.particleCount;
        const resetProb = this.options.resetProbability;
        const speed = this.options.windSpeed;

        for (let i = 0; i < particleCount; i++) {
            if (Math.random() < resetProb || this.particleAges[i] > 150) {
                this.particleUVs[i * 2] = Math.random();
                this.particleUVs[i * 2 + 1] = Math.random();
                this.particleAges[i] = 0;
            }

            const uv = {
                x: this.particleUVs[i * 2],
                y: this.particleUVs[i * 2 + 1]
            };

            const wind = this.sampleWindAtUV(uv);

            const velocityX = (wind.u * speed * deltaTime) / 360;
            const velocityY = (wind.v * speed * deltaTime) / 180;

            this.particleUVs[i * 2] += velocityX;
            this.particleUVs[i * 2 + 1] += velocityY;

            this.particleUVs[i * 2] = ((this.particleUVs[i * 2] % 1) + 1) % 1;
            this.particleUVs[i * 2 + 1] = Math.max(0, Math.min(1, this.particleUVs[i * 2 + 1]));

            this.particleAges[i] += deltaTime;

            this.updateParticleWorldPosition(i);
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.render();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.clock.start();
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setWindSpeed(speed) {
        this.options.windSpeed = speed;
    }

    setParticleSize(size) {
        this.options.particleSize = size;
        if (this.particleSystem) {
            this.particleSystem.material.size = size;
        }
    }

    resetParticles() {
        const particleCount = this.options.particleCount;
        for (let i = 0; i < particleCount; i++) {
            this.particleUVs[i * 2] = Math.random();
            this.particleUVs[i * 2 + 1] = Math.random();
            this.particleAges[i] = Math.random() * 50;
            this.updateParticleWorldPosition(i);
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize.bind(this));

        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }

        if (this.windDataTexture) {
            this.windDataTexture.destroy();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.options.container.removeChild(this.renderer.domElement);
        }
    }
}
