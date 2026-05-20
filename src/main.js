import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class PrismOpticsSimulation {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.prism = null;
        this.lightRays = [];
        this.lightSourcePosition = { x: -4, y: 2, z: 5 };
        this.intensity = 1.0;
        this.dragging = false;
        this.init();
    }

    init() {
        this.setupScene();
        this.createPrism();
        this.createLightRays();
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        const canvas = document.getElementById('canvas');
        const container = document.getElementById('container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1117);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 8);
        this.camera.lookAt(0, 0.5, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(3, 5, 5);
        this.scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0x4facfe, 0.5);
        pointLight1.position.set(-5, 3, 5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x00f2fe, 0.5);
        pointLight2.position.set(5, 3, -5);
        this.scene.add(pointLight2);

        const gridHelper = new THREE.GridHelper(12, 12, 0x333333, 0x222222);
        gridHelper.position.y = -1.5;
        this.scene.add(gridHelper);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 20;

        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });
    }

    createPrism() {
        const geometry = new THREE.CylinderGeometry(0, 1.5, 3, 3, 1, true);
        geometry.rotateZ(Math.PI / 2);
        geometry.rotateY(Math.PI / 6);

        const material = new THREE.MeshPhysicalMaterial({
            color: 0x88bbff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.0,
            transmission: 0.9,
            thickness: 1.5,
            side: THREE.DoubleSide
        });

        this.prism = new THREE.Mesh(geometry, material);
        this.prism.position.y = 0.5;
        this.scene.add(this.prism);

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.8 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        this.prism.add(wireframe);
    }

    getRefractiveIndex(wavelength) {
        const B1 = 1.03961212;
        const C1 = 0.00600069867;
        const B2 = 0.231792344;
        const C2 = 0.0200179144;
        const B3 = 1.01046945;
        const C3 = 103.560653;
        
        const lambda = wavelength * 0.001;
        const lambda2 = lambda * lambda;
        
        const n2 = 1 + B1 * lambda2 / (lambda2 - C1) + B2 * lambda2 / (lambda2 - C2) + B3 * lambda2 / (lambda2 - C3);
        return Math.sqrt(n2);
    }

    calculateRefraction(incidentDir, normal, n1, n2) {
        const incident = incidentDir.clone().normalize();
        const norm = normal.clone().normalize();
        
        const eta = n1 / n2;
        const cosTheta1 = -incident.dot(norm);
        const sinTheta1Sq = 1 - cosTheta1 * cosTheta1;
        
        if (sinTheta1Sq > 1 / (eta * eta)) {
            return null;
        }
        
        const cosTheta2 = Math.sqrt(1 - sinTheta1Sq * eta * eta);
        const refractedDir = incident.clone().multiplyScalar(eta)
            .add(norm.clone().multiplyScalar(eta * cosTheta1 - cosTheta2));
        
        return refractedDir.normalize();
    }

    getColorFromWavelength(wavelength) {
        let r = 0, g = 0, b = 0;
        
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            b = 1;
        } else if (wavelength >= 440 && wavelength < 490) {
            g = (wavelength - 440) / (490 - 440);
            b = 1;
        } else if (wavelength >= 490 && wavelength < 510) {
            g = 1;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1;
            g = -(wavelength - 645) / (645 - 580);
        } else if (wavelength >= 645 && wavelength <= 780) {
            r = 1;
        }

        return new THREE.Color(r, g, b);
    }

    createLightRays() {
        this.lightRays.forEach(ray => {
            if (ray.mesh) {
                this.scene.remove(ray.mesh);
                ray.mesh.geometry.dispose();
                ray.mesh.material.dispose();
            }
        });
        this.lightRays = [];

        const wavelengths = [380, 410, 440, 470, 500, 530, 560, 590, 620, 650, 680, 720, 750];
        
        wavelengths.forEach(wavelength => {
            const ray = this.createRay(wavelength);
            if (ray) this.lightRays.push(ray);
        });
    }

    createRay(wavelength) {
        const n = this.getRefractiveIndex(wavelength);
        const color = this.getColorFromWavelength(wavelength);
        
        const startPoint = new THREE.Vector3(
            this.lightSourcePosition.x,
            this.lightSourcePosition.y,
            this.lightSourcePosition.z
        );
        
        const direction = new THREE.Vector3(4, -1, -4).normalize();
        
        this.prism.updateMatrixWorld(true);
        
        const raycaster = new THREE.Raycaster(startPoint, direction, 0, 100);
        const intersects = raycaster.intersectObject(this.prism, false);
        
        if (intersects.length === 0) return null;
        
        const intersection1 = intersects[0];
        const normal1 = intersection1.face.normal.clone();
        normal1.transformDirection(this.prism.matrixWorld).normalize();
        
        const refractedDir1 = this.calculateRefraction(direction, normal1, 1.0, n);
        if (!refractedDir1) return null;
        
        const pointAfterEntry = intersection1.point.clone().add(refractedDir1.clone().multiplyScalar(0.01));
        
        const raycaster2 = new THREE.Raycaster(pointAfterEntry, refractedDir1, 0, 100);
        const intersects2 = raycaster2.intersectObject(this.prism, false);
        
        if (intersects2.length === 0) return null;
        
        const intersection2 = intersects2[0];
        const normal2 = intersection2.face.normal.clone();
        normal2.transformDirection(this.prism.matrixWorld).normalize();
        
        const refractedDir2 = this.calculateRefraction(refractedDir1, normal2, n, 1.0);
        if (!refractedDir2) return null;
        
        const endPoint = intersection2.point.clone().add(refractedDir2.clone().multiplyScalar(20));
        
        const points = [startPoint, intersection1.point, intersection2.point, endPoint];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: 3,
            transparent: true,
            opacity: this.intensity
        });
        
        const mesh = new THREE.Line(geometry, material);
        this.scene.add(mesh);
        
        return { mesh, wavelength };
    }

    setupEventListeners() {
        const lightSource = document.getElementById('light-source');
        
        lightSource.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.lightStartX = this.lightSourcePosition.x;
            this.lightStartY = this.lightSourcePosition.y;
            this.dragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.dragging) return;

            const deltaX = (e.clientX - this.dragStartX) * 0.02;
            const deltaY = (e.clientY - this.dragStartY) * -0.02;

            this.lightSourcePosition.x = this.lightStartX + deltaX;
            this.lightSourcePosition.y = this.lightStartY + deltaY;

            lightSource.style.left = e.clientX - 10 + 'px';
            lightSource.style.top = e.clientY - 10 + 'px';
        });

        document.addEventListener('mouseup', () => {
            this.dragging = false;
        });

        const intensitySlider = document.getElementById('intensity');
        const intensityValue = document.getElementById('intensity-value');
        intensitySlider.addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            intensityValue.textContent = this.intensity;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.prism) {
            this.prism.rotation.y += 0.003;
        }
        
        this.controls.update();
        this.createLightRays();
        
        this.renderer.render(this.scene, this.camera);
    }
}

new PrismOpticsSimulation();