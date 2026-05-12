import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class SceneRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clothMesh = null;
    this.poleMesh = null;
    this.animationId = null;
    this.physics = null;
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(6, 3, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;

    this.setupLights();
    this.setupPole();

    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6633, 0.8, 20);
    rimLight.position.set(-3, 2, 5);
    this.scene.add(rimLight);
  }

  setupPole() {
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 6, 16);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.3,
      roughness: 0.7
    });
    this.poleMesh = new THREE.Mesh(poleGeometry, poleMaterial);
    this.poleMesh.position.set(0, 0, 0);
    this.poleMesh.castShadow = true;
    this.poleMesh.receiveShadow = true;
    this.scene.add(this.poleMesh);
  }

  createClothMesh(physics) {
    this.physics = physics;
    const { segmentsX, segmentsY, width, height } = physics.config;

    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 3);
    const indices = [];
    const uvs = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 2);

    const particles = physics.getParticles();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      vertices[i * 3] = p.position.x;
      vertices[i * 3 + 1] = p.position.y;
      vertices[i * 3 + 2] = p.position.z;
    }

    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = j * (segmentsX + 1) + i;
        const b = a + 1;
        const c = a + (segmentsX + 1);
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const idx = j * (segmentsX + 1) + i;
        uvs[idx * 2] = i / segmentsX;
        uvs[idx * 2 + 1] = 1 - j / segmentsY;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const canvas = this.createFlagTexture(width, height, segmentsX, segmentsY);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.8,
      flatShading: false
    });

    this.clothMesh = new THREE.Mesh(geometry, material);
    this.clothMesh.castShadow = true;
    this.clothMesh.receiveShadow = true;
    this.scene.add(this.clothMesh);
  }

  createFlagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff3333');
    gradient.addColorStop(0.5, '#ff4444');
    gradient.addColorStop(1, '#cc2222');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = 'bold 32px Arial';
    ctx.fillText('THREE.JS', canvas.width / 2, canvas.height / 2 + 60);

    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('CLOTH SIMULATION', canvas.width / 2, canvas.height / 2 + 95);

    return canvas;
  }

  updateMesh() {
    if (!this.clothMesh || !this.physics) return;

    const particles = this.physics.getParticles();
    const positions = this.clothMesh.geometry.attributes.position.array;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    }

    this.clothMesh.geometry.attributes.position.needsUpdate = true;
    this.clothMesh.geometry.computeVertexNormals();
  }

  start(physics) {
    this.createClothMesh(physics);
    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.physics) {
      const substeps = 2;
      const subDelta = delta / substeps;
      for (let i = 0; i < substeps; i++) {
        this.physics.update(subDelta);
      }
      this.updateMesh();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', () => this.onResize());

    if (this.clothMesh) {
      this.clothMesh.geometry.dispose();
      if (this.clothMesh.material.map) {
        this.clothMesh.material.map.dispose();
      }
      this.clothMesh.material.dispose();
    }

    if (this.poleMesh) {
      this.poleMesh.geometry.dispose();
      this.poleMesh.material.dispose();
    }

    this.renderer.dispose();
    this.controls.dispose();
  }
}

export { SceneRenderer };
