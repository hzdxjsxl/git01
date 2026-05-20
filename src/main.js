import * as THREE from 'three';

class PrismOpticsSimulation {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.prism = null;
        this.lightRays = [];
        this.lightSourcePosition = { x: -4, y: 2, z: 5 };
        this.wavelength = 550;
        this.intensity = 1.0;
        this.mouseDown = false;
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
        this.scene.background = new THREE.Color(0x1a1a2e);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        gridHelper.position.y = -2;
        this.scene.add(gridHelper);

        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });
    }

    createPrism() {
        const geometry = new THREE.CylinderGeometry(0, 0.8, 3, 3, 1, true);
        geometry.rotateZ(Math.PI / 2);
        geometry.rotateY(Math.PI / 6);

        const material = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            shininess: 100,
            side: THREE.DoubleSide
        });

        this.prism = new THREE.Mesh(geometry, material);
        this.prism.position.y = 0.5;
        this.scene.add(this.prism);
    }

    getRefractiveIndex(wavelength) {
        const B = 0.004607;
        const C = 0.00001341;
        const D = 0.0008696;
        const E = 0.00008744;
        const F = 0.001125;
        const G = 0.00004441;
        
        const lambda = wavelength * 1e-9;
        const lambda2 = lambda * lambda;
        const lambda4 = lambda2 * lambda2;
        const lambda6 = lambda4 * lambda2;
        
        const n2 = 1 + B / (1 - C / lambda2) + D / (1 - E / lambda2) + F / (1 - G / lambda2);
        return Math.sqrt(n2);
    }

    calculateRefraction(incidentDir, normal, n1, n2) {
        const dotProduct = incidentDir.dot(normal);
        const sinTheta1 = Math.sqrt(1 - dotProduct * dotProduct);
        const sinTheta2 = (n1 / n2) * sinTheta1;

        if (Math.abs(sinTheta2) > 1) {
            return null;
        }

        const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
        const refractedDir = incidentDir.clone()
            .multiplyScalar(n1 / n2)
            .add(normal.clone().multiplyScalar((n1 / n2) * dotProduct - cosTheta2));
        
        return refractedDir.normalize();
    }

    getColorFromWavelength(wavelength) {
        let r, g, b;
        
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0;
            b = 1;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0;
            g = (wavelength - 440) / (490 - 440);
            b = 1;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0;
            g = 1;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1;
            b = 0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1;
            g = -(wavelength - 645) / (645 - 580);
            b = 0;
        } else if (wavelength >= 645 && wavelength <= 780) {
            r = 1;
            g = 0;
            b = 0;
        } else {
            r = 0;
            g = 0;
            b = 0;
        }

        const gamma = 2.2;
        return new THREE.Color(
            Math.pow(r, gamma),
            Math.pow(g, gamma),
            Math.pow(b, gamma)
        );
    }

    createLightRays() {
        this.lightRays.forEach(ray => this.scene.remove(ray.mesh));
        this.lightRays = [];

        const wavelengths = [380, 420, 470, 520, 570, 620, 680, 750];
        
        wavelengths.forEach(wavelength => {
            const ray = this.createRay(wavelength);
            this.lightRays.push(ray);
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
        
        const direction = new THREE.Vector3(2, -1, -3).normalize();
        
        const intersection1 = this.rayIntersectsPrism(startPoint, direction);
        if (!intersection1) return null;

        const normal1 = this.getPrismNormal(intersection1.point);
        const refractedDir1 = this.calculateRefraction(direction.clone().negate(), normal1, 1.0, n);
        
        if (!refractedDir1) return null;

        const intersection2 = this.rayIntersectsPrism(intersection1.point, refractedDir1);
        if (!intersection2) return null;

        const normal2 = this.getPrismNormal(intersection2.point);
        const refractedDir2 = this.calculateRefraction(refractedDir1.clone().negate(), normal2, n, 1.0);
        
        if (!refractedDir2) return null;

        const endPoint = intersection2.point.clone().add(refractedDir2.clone().multiplyScalar(10));

        const points = [startPoint, intersection1.point, intersection2.point, endPoint];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: 2,
            transparent: true,
            opacity: this.intensity
        });
        
        const mesh = new THREE.Line(geometry, material);
        
        this.scene.add(mesh);
        
        return { mesh, wavelength };
    }

    rayIntersectsPrism(start, direction) {
        const inverseDirection = new THREE.Vector3(
            1 / direction.x,
            1 / direction.y,
            1 / direction.z
        );

        const min = new THREE.Vector3(-0.8, -0.5, -1.5);
        const max = new THREE.Vector3(0.8, 1.5, 1.5);

        const t1 = (min.x - start.x) * inverseDirection.x;
        const t2 = (max.x - start.x) * inverseDirection.x;
        const t3 = (min.y - start.y) * inverseDirection.y;
        const t4 = (max.y - start.y) * inverseDirection.y;
        const t5 = (min.z - start.z) * inverseDirection.z;
        const t6 = (max.z - start.z) * inverseDirection.z;

        const tMin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        const tMax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

        if (tMax < 0 || tMin > tMax) return null;

        const t = tMin >= 0 ? tMin : tMax;
        const point = start.clone().add(direction.clone().multiplyScalar(t));

        return { point, t };
    }

    getPrismNormal(point) {
        const prismCenter = new THREE.Vector3(0, 0.5, 0);
        
        const inverseMatrix = new THREE.Matrix4().copy(this.prism.matrixWorld).invert();
        const localPoint = point.clone().applyMatrix4(inverseMatrix);
        
        const localCenter = new THREE.Vector3(0, 0.5, 0);
        const localToCenter = localPoint.clone().sub(localCenter);
        
        const angle = Math.atan2(localToCenter.z, localToCenter.x);
        const faceAngle = (Math.PI / 3);
        let faceIndex = Math.floor((angle + faceAngle / 2) / faceAngle);
        
        if (faceIndex < 0) faceIndex += 3;
        if (faceIndex >= 3) faceIndex -= 3;
        
        const localNormals = [
            new THREE.Vector3(Math.cos(0), 0, Math.sin(0)),
            new THREE.Vector3(Math.cos(2 * Math.PI / 3), 0, Math.sin(2 * Math.PI / 3)),
            new THREE.Vector3(Math.cos(4 * Math.PI / 3), 0, Math.sin(4 * Math.PI / 3))
        ];
        
        const localNormal = localNormals[faceIndex].normalize();
        
        const worldNormal = localNormal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(this.prism.matrixWorld));
        
        return worldNormal.normalize();
    }

    setupEventListeners() {
        const lightSource = document.getElementById('light-source');
        const container = document.getElementById('container');
        
        lightSource.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.lightStartX = this.lightSourcePosition.x;
            this.lightStartY = this.lightSourcePosition.y;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;

            const deltaX = (e.clientX - this.dragStartX) * 0.02;
            const deltaY = (e.clientY - this.dragStartY) * -0.02;

            this.lightSourcePosition.x = this.lightStartX + deltaX;
            this.lightSourcePosition.y = this.lightStartY + deltaY;

            lightSource.style.left = e.clientX - 10 + 'px';
            lightSource.style.top = e.clientY - 10 + 'px';

            this.updateLightRays();
        });

        document.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        const wavelengthSlider = document.getElementById('wavelength');
        const wavelengthValue = document.getElementById('wavelength-value');
        wavelengthSlider.addEventListener('input', (e) => {
            this.wavelength = parseInt(e.target.value);
            wavelengthValue.textContent = this.wavelength;
            this.updateLightRays();
        });

        const intensitySlider = document.getElementById('intensity');
        const intensityValue = document.getElementById('intensity-value');
        intensitySlider.addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            intensityValue.textContent = this.intensity;
            this.updateLightRays();
        });
    }

    updateLightRays() {
        this.lightRays.forEach(ray => this.scene.remove(ray.mesh));
        this.lightRays = [];
        this.createLightRays();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.prism) {
            this.prism.rotation.y += 0.005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

new PrismOpticsSimulation();