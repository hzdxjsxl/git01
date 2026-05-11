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
        await this.setupWindDataTexture(windDataUrl);
        this.setupPositionRenderTargets();
        this.setupAdvectionPass();
        this.setupParticleSystem();
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

        this.initializePositionsJS();
    }

    initializePositionsJS() {
        const textureSize = this.particleTextureSize;
        const totalPixels = textureSize * textureSize;
        
        const data = new Float32Array(totalPixels * 4);
        
        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            data[idx] = Math.random();
            data[idx + 1] = Math.random();
            data[idx + 2] = Math.random() * 50;
            data[idx + 3] = 50 + Math.random() * 100;
        }

        const texture0 = new THREE.DataTexture(
            data,
            textureSize,
            textureSize,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        texture0.minFilter = THREE.NearestFilter;
        texture0.magFilter = THREE.NearestFilter;
        texture0.needsUpdate = true;

        const data1 = new Float32Array(data);
        const texture1 = new THREE.DataTexture(
            data1,
            textureSize,
            textureSize,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        texture1.minFilter = THREE.NearestFilter;
        texture1.magFilter = THREE.NearestFilter;
        texture1.needsUpdate = true;

        const quadScene = new THREE.Scene();
        const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quadGeometry = new THREE.PlaneGeometry(2, 2);

        const copyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: texture0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D u_texture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(u_texture, vUv);
                }
            `,
            depthWrite: false,
            depthTest: false
        });

        const quad = new THREE.Mesh(quadGeometry, copyMaterial);
        quadScene.add(quad);

        this.renderer.setRenderTarget(this.positionRenderTargets[0]);
        this.renderer.render(quadScene, quadCamera);

        copyMaterial.uniforms.u_texture.value = texture1;
        this.renderer.setRenderTarget(this.positionRenderTargets[1]);
        this.renderer.render(quadScene, quadCamera);

        this.renderer.setRenderTarget(null);

        copyMaterial.dispose();
        quadGeometry.dispose();
        texture0.dispose();
        texture1.dispose();
    }

    setupAdvectionPass() {
        this.advectionScene = new THREE.Scene();
        this.advectionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const quadGeometry = new THREE.PlaneGeometry(2, 2);

        const bounds = this.windDataTexture ? this.windDataTexture.getBounds() : {
            minLon: -180, maxLon: 180, minLat: -90, maxLat: 90
        };

        const lonRange = bounds.maxLon - bounds.minLon || 360;
        const latRange = bounds.maxLat - bounds.minLat || 180;

        this.advectionMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_positionTexture: { value: null },
                u_windTexture: { value: this.windDataTexture?.getTexture() || null },
                u_time: { value: 0 },
                u_deltaTime: { value: 0.016 },
                u_speed: { value: this.options.windSpeed },
                u_windTextureSize: { value: new THREE.Vector2(1, 1) },
                u_resetProbability: { value: this.options.resetProbability },
                u_lonLatBounds: { value: new THREE.Vector4(bounds.minLon, bounds.maxLon, bounds.minLat, bounds.maxLat) },
                u_lonRange: { value: lonRange },
                u_latRange: { value: latRange }
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

        const bounds = this.windDataTexture ? this.windDataTexture.getBounds() : {
            minLon: -180, maxLon: 180, minLat: -90, maxLat: 90
        };

        const lonRange = bounds.maxLon - bounds.minLon || 360;
        const latRange = bounds.maxLat - bounds.minLat || 180;

        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_positionTexture: { value: this.positionRenderTargets[this.currentPositionTarget].texture },
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
                u_maxWindSpeed: { value: this.options.maxWindSpeed },
                u_lonLatBounds: { value: new THREE.Vector4(bounds.minLon, bounds.maxLon, bounds.minLat, bounds.maxLat) },
                u_lonRange: { value: lonRange },
                u_latRange: { value: latRange }
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
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);

        this.createGlobeMesh();
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
            opacity: 0.6
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

        if (!this.advectionMaterial.uniforms.u_windTexture.value && this.windDataTexture) {
            this.advectionMaterial.uniforms.u_windTexture.value = this.windDataTexture.getTexture();
            this.particleMaterial.uniforms.u_windTexture.value = this.windDataTexture.getTexture();
        }

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

    updatePositionsJS() {
        const textureSize = this.particleTextureSize;
        const totalPixels = textureSize * textureSize;
        const data = new Float32Array(totalPixels * 4);

        const oldTarget = this.positionRenderTargets[this.currentPositionTarget];
        const newTarget = this.positionRenderTargets[1 - this.currentPositionTarget];

        const quadScene = new THREE.Scene();
        const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quadGeometry = new THREE.PlaneGeometry(2, 2);

        const readMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: oldTarget.texture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D u_texture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(u_texture, vUv);
                }
            `,
            depthWrite: false,
            depthTest: false
        });

        const quad = new THREE.Mesh(quadGeometry, readMaterial);
        quadScene.add(quad);

        this.renderer.setRenderTarget(newTarget);
        this.renderer.render(quadScene, quadCamera);
        this.renderer.setRenderTarget(null);

        readMaterial.dispose();
        quadGeometry.dispose();

        this.currentPositionTarget = 1 - this.currentPositionTarget;
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
