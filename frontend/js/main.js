import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VolumeTextureLoader } from './VolumeTextureLoader.js?v=3.0';
import { volumeVertexShader } from './shaders/volumeVertexShader.js?v=3.0';
import { volumeFragmentShader } from './shaders/volumeFragmentShader.js?v=3.0';

class VolumeViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.volumeMesh = null;
        this.volumeMaterial = null;
        
        this.params = {
            skinThreshold: 0.3,
            boneThreshold: 0.7,
            stepSize: 0.008,
            maxSteps: 512
        };
        
        this.init();
    }

    init() {
        const canvas = document.getElementById('canvas');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.001,
            100
        );
        this.camera.position.set(0, 0, 3);
        
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            alert('您的浏览器不支持 WebGL2，无法运行此应用');
            return;
        }
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: gl,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 10;
        
        this.setupUI();
        this.loadVolume();
        
        window.addEventListener('resize', () => this.onResize());
    }

    setupUI() {
        const skinSlider = document.getElementById('skinThreshold');
        const boneSlider = document.getElementById('boneThreshold');
        const stepSlider = document.getElementById('stepSize');
        
        skinSlider.addEventListener('input', (e) => {
            this.params.skinThreshold = parseFloat(e.target.value);
            document.getElementById('skinVal').textContent = this.params.skinThreshold.toFixed(2);
            if (this.volumeMaterial) {
                this.volumeMaterial.uniforms.skinThreshold.value = this.params.skinThreshold;
            }
        });
        
        boneSlider.addEventListener('input', (e) => {
            this.params.boneThreshold = parseFloat(e.target.value);
            document.getElementById('boneVal').textContent = this.params.boneThreshold.toFixed(2);
            if (this.volumeMaterial) {
                this.volumeMaterial.uniforms.boneThreshold.value = this.params.boneThreshold;
            }
        });
        
        stepSlider.addEventListener('input', (e) => {
            this.params.stepSize = parseFloat(e.target.value);
            document.getElementById('stepVal').textContent = this.params.stepSize.toFixed(3);
            if (this.volumeMaterial) {
                this.volumeMaterial.uniforms.stepSize.value = this.params.stepSize;
            }
        });
    }

    loadVolume() {
        const loader = new VolumeTextureLoader();
        
        loader.load(
            '/api/volume?v=' + Date.now(),
            (texture, dimensions) => {
                this.createVolumeMesh(texture, dimensions);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('controls').style.display = 'block';
                this.animate();
            },
            (xhr) => {
                console.log(`Loaded ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            (error) => {
                console.error('Error loading volume:', error);
                document.getElementById('loading').innerHTML = '<p style="color: #ff6b6b;">加载失败，请检查后端服务是否启动</p>';
            }
        );
    }

    createVolumeMesh(texture, dimensions) {
        const volumeScale = 1.5;
        
        this.volumeMaterial = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: volumeVertexShader,
            fragmentShader: volumeFragmentShader,
            uniforms: {
                volumeTexture: { value: texture },
                cameraPos: { value: new THREE.Vector3() },
                lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
                stepSize: { value: this.params.stepSize },
                maxSteps: { value: this.params.maxSteps },
                skinThreshold: { value: this.params.skinThreshold },
                boneThreshold: { value: this.params.boneThreshold },
                volumeCenter: { value: new THREE.Vector3(0, 0, 0) },
                volumeScale: { value: volumeScale }
            },
            side: THREE.BackSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const geometry = new THREE.BoxGeometry(volumeScale, volumeScale, volumeScale);
        this.volumeMesh = new THREE.Mesh(geometry, this.volumeMaterial);
        this.scene.add(this.volumeMesh);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        if (this.volumeMaterial) {
            this.volumeMaterial.uniforms.cameraPos.value.copy(this.camera.position);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

const viewer = new VolumeViewer();
