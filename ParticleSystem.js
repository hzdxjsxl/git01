import * as THREE from 'three';
import { WindDataTexture } from './WindDataTexture.js';
import { WindShaders } from './WindShaders.js';

export class ParticleSystem {
    constructor(options = {}) {
        this.options = {
            container: options.container || document.body,
            particleCount: options.particleCount || 1000000,
            particleSize: options.particleSize || 2.0,
            windSpeed: options.windSpeed || 1.0,
            globeRadius: options.globeRadius || 100,
            autoRotate: options.autoRotate !== false,
            rotationSpeed: options.rotationSpeed || 0.0002,
            backgroundColor: options.backgroundColor || 0x050510,
            colorHigh: options.colorHigh || new THREE.Color(0x00ffff),
            colorLow: options.colorLow || new THREE.Color(0x444488),
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
        this.positionRenderTargets = [];
        this.currentPositionTarget = 0;
        this.advectionScene = null;
        this.advectionCamera = null;
        this.advectionMaterial = null;
        this.clock = null;
        this.rotationY = 0;
        this.animationId = null;
        this.isRunning = false;
    }

    async init(windDataUrl) {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupWindDataTexture(windDataUrl);
        this.setupPositionRenderTargets();
        this.setupAdvectionPass();
        this.setupParticleSystem();
        this.setupControls();
        this.clock = new THREE.Clock();
        this.isRunning = true;
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
        this.scene.background = new THREE.Color(this.options.backgroundColor);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 0, this.options.globeRadius * 3.5);
        this.camera.lookAt(0, 0, 0);
    }

    async setupWindDataTexture(windDataUrl) {
        this.windDataTexture = new WindDataTexture(this.renderer);
        await this.windDataTexture.loadFromJSON(windDataUrl);
        
        const bounds = this.windDataTexture.getBounds();
        const uvRange = this.windDataTexture.getUVRange();
        
        if (this.options.maxWindSpeed === 100.0) {
            this.options.maxWindSpeed = uvRange;
        }
    }

    setupPositionRenderTargets() {
        const particleCount = this.options.particleCount;
        const textureSize = Math.ceil(Math.sqrt(particleCount));
        this.particleTextureSize = textureSize;

        const options = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            stencilBuffer: false,
            depthBuffer: false
        };

        this.positionRenderTargets[0] = new THREE.WebGLRenderTarget(textureSize, textureSize, options);
        this.positionRenderTargets[1] = new THREE.WebGLRenderTarget(textureSize, textureSize, options);

        this.initializePositions();
    }

    initializePositions() {
        const initMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: Date.now() * 0.001 }
            },
            vertexShader: WindShaders.initializePositionVertex,
            fragmentShader: WindShaders.initializePositionFragment,
            depthWrite: false,
            depthTest: false
        });

        const quadScene = new THREE.Scene();
        const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        const quad = new THREE.Mesh(quadGeometry, initMaterial);
        quadScene.add(quad);

        this.renderer.setRenderTarget(this.positionRenderTargets[0]);
        this.renderer.render(quadScene, quadCamera);
        this.renderer.setRenderTarget(this.positionRenderTargets[1]);
        this.renderer.render(quadScene, quadCamera);
        this.renderer.setRenderTarget(null);

        initMaterial.dispose();
        quadGeometry.dispose();
    }

    setupAdvectionPass() {
        this.advectionScene = new THREE.Scene();
        this.advectionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const quadGeometry = new THREE.PlaneGeometry(2, 2);

        this.advectionMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_positionTexture: { value: null },
                u_windTexture: { value: this.windDataTexture?.getTexture() || null },
                u_time: { value: 0 },
                u_deltaTime: { value: 0.016 },
                u_speed: { value: this.options.windSpeed },
                u_windTextureSize: { value: new THREE.Vector2(1, 1) },
                u_resetProbability: { value: this.options.resetProbability }
            },
            vertexShader: WindShaders.advectionComputeVertex,
            fragmentShader: WindShaders.advectionComputeFragment,
            depthWrite: false,
            depthTest: false
        });

        if (this.windDataTexture) {
            const dims = this.windDataTexture.getDimensions();
            this.advectionMaterial.uniforms.u_windTextureSize.value.set(dims.width, dims.height);
        }

        this.advectionQuad = new THREE.Mesh(quadGeometry, this.advectionMaterial);
        this.advectionScene.add(this.advectionQuad);
    }

    setupParticleSystem() {
        const particleCount = this.options.particleCount;
        const textureSize = this.particleTextureSize;

        const geometry = new THREE.BufferGeometry();
        const uvs = new Float32Array(particleCount * 2);

        for (let i = 0; i < particleCount; i++) {
            const x = (i % textureSize) / textureSize;
            const y = Math.floor(i / textureSize) / textureSize;
            uvs[i * 2] = x + 0.5 / textureSize;
            uvs[i * 2 + 1] = y + 0.5 / textureSize;
        }

        geometry.setAttribute('a_uv', new THREE.BufferAttribute(uvs, 2));

        const currentTarget = this.positionRenderTargets[this.currentPositionTarget];

        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_positionTexture: { value: currentTarget.texture },
                u_windTexture: { value: this.windDataTexture?.getTexture() || null },
                u_time: { value: 0 },
                u_particleSize: { value: this.options.particleSize },
                u_rotationMatrix: { value: new THREE.Matrix4() },
                u_fadeStart: { value: this.options.fadeStart },
                u_fadeEnd: { value: this.options.fadeEnd },
                u_radius: { value: this.options.globeRadius },
                u_windTextureSize: { value: new THREE.Vector2(1, 1) },
                u_colorHigh: { value: this.options.colorHigh },
                u_colorLow: { value: this.options.colorLow },
                u_maxWindSpeed: { value: this.options.maxWindSpeed }
            },
            vertexShader: WindShaders.particleVertex,
            fragmentShader: WindShaders.particleFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        if (this.windDataTexture) {
            const dims = this.windDataTexture.getDimensions();
            this.particleMaterial.uniforms.u_windTextureSize.value.set(dims.width, dims.height);
        }

        this.particleSystem = new THREE.Points(geometry, this.particleMaterial);
        this.scene.add(this.particleSystem);

        this.createGlobeMesh();
    }

    createGlobeMesh() {
        const globeGeometry = new THREE.SphereGeometry(this.options.globeRadius, 64, 64);
        const globeMaterial = new THREE.MeshBasicMaterial({
            color: 0x111133,
            wireframe: true,
            transparent: true,
            opacity: 0.15
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
        const elapsedTime = this.clock.getElapsedTime();

        if (this.options.autoRotate && !this.controls) {
            this.rotationY += this.options.rotationSpeed * deltaTime * 60;
        } else if (this.controls) {
            this.controls.update();
            this.rotationY = 0;
        }

        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(this.rotationY);
        this.particleMaterial.uniforms.u_rotationMatrix.value = rotationMatrix;

        this.advectionMaterial.uniforms.u_positionTexture.value = 
            this.positionRenderTargets[this.currentPositionTarget].texture;
        this.advectionMaterial.uniforms.u_time.value = elapsedTime;
        this.advectionMaterial.uniforms.u_deltaTime.value = Math.min(deltaTime, 0.1);
        this.advectionMaterial.uniforms.u_speed.value = this.options.windSpeed;

        const nextTarget = 1 - this.currentPositionTarget;
        this.renderer.setRenderTarget(this.positionRenderTargets[nextTarget]);
        this.renderer.render(this.advectionScene, this.advectionCamera);
        this.renderer.setRenderTarget(null);

        this.currentPositionTarget = nextTarget;

        this.particleMaterial.uniforms.u_positionTexture.value = 
            this.positionRenderTargets[this.currentPositionTarget].texture;
        this.particleMaterial.uniforms.u_time.value = elapsedTime;
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
        this.particleMaterial.uniforms.u_particleSize.value = size;
    }

    setColors(high, low) {
        if (high) this.particleMaterial.uniforms.u_colorHigh.value = high;
        if (low) this.particleMaterial.uniforms.u_colorLow.value = low;
    }

    resetParticles() {
        this.initializePositions();
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize.bind(this));

        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleMaterial.dispose();
        }

        if (this.advectionMaterial) {
            this.advectionMaterial.dispose();
        }

        this.positionRenderTargets.forEach(rt => rt.dispose());

        if (this.windDataTexture) {
            this.windDataTexture.destroy();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.options.container.removeChild(this.renderer.domElement);
        }
    }
}
