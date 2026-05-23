class WindTunnelRenderer {
  constructor(container, config) {
    this.container = container;
    this.config = config || {};
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.buildingMesh = null;
    this.windLines = null;
    this.windLineMaterial = null;
    this.windLineGeo = null;
    this.particles = null;
    this.clock = null;
    this.solver = null;
    this.windParticles = null;
    this.animating = false;
    this.stats = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 200, 600);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2000);
    this.camera.position.set(180, 120, 200);
    this.camera.lookAt(0, 60, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.addLights();
    this.addGround();
    this.addWindArrows();
    this.addBoundingBox();

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 60, 0);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.onResize());
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(150, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 600;
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-100, 80, -100);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6644, 0.2);
    rimLight.position.set(-50, 60, 150);
    this.scene.add(rimLight);
  }

  addGround() {
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(600, 60, 0x222244, 0x1a1a30);
    gridHelper.position.y = -19.9;
    this.scene.add(gridHelper);
  }

  addWindArrows() {
    const arrowGroup = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const dir = new THREE.Vector3(1, 0, 0);
      const origin = new THREE.Vector3(-150, 10 + i * 18, -50 + i * 10);
      const arrow = new THREE.ArrowHelper(dir, origin, 30, 0x00ffaa, 8, 4);
      arrowGroup.add(arrow);
    }
    this.scene.add(arrowGroup);
  }

  addBoundingBox() {
    const boxGeo = new THREE.BoxGeometry(220, 260, 180);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: 0x334466,
      transparent: true,
      opacity: 0.3
    }));
    line.position.set(0, 90, 0);
    this.scene.add(line);
  }

  loadBuilding(data) {
    if (this.buildingMesh) {
      this.scene.remove(this.buildingMesh);
    }

    const { vertices, faces } = data;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(faces.length * 3 * 3);
    const normals = new Float32Array(faces.length * 3 * 3);

    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];
      for (let v = 0; v < 3; v++) {
        const idx = face[v] * 3;
        const posIdx = (f * 3 + v) * 3;
        positions[posIdx] = vertices[idx];
        positions[posIdx + 1] = vertices[idx + 1];
        positions[posIdx + 2] = vertices[idx + 2];
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a6fa5,
      roughness: 0.4,
      metalness: 0.6,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x6688bb,
      transparent: true,
      opacity: 0.6
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);

    this.buildingMesh = mesh;
    this.scene.add(mesh);

    return data.bounds;
  }

  setupWindVisuals() {
    this.windLinePositions = new Float32Array(200000 * 3 * 2);
    this.windLineColors = new Float32Array(200000 * 3 * 2);
    this.windLineGeo = new THREE.BufferGeometry();
    this.windLineGeo.setAttribute('position', new THREE.BufferAttribute(this.windLinePositions, 3));
    this.windLineGeo.setAttribute('color', new THREE.BufferAttribute(this.windLineColors, 3));

    this.windLineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.windLines = new THREE.LineSegments(this.windLineGeo, this.windLineMaterial);
    this.windLines.frustumCulled = false;
    this.scene.add(this.windLines);
  }

  updateWindVisuals(segments) {
    if (!this.windLineGeo) return;

    const maxSegments = 200000;
    const numSegments = Math.min(segments.length, maxSegments);

    for (let i = 0; i < numSegments; i++) {
      const seg = segments[i];
      const posIdx = i * 6;
      this.windLinePositions[posIdx] = seg.from[0];
      this.windLinePositions[posIdx + 1] = seg.from[1];
      this.windLinePositions[posIdx + 2] = seg.from[2];
      this.windLinePositions[posIdx + 3] = seg.to[0];
      this.windLinePositions[posIdx + 4] = seg.to[1];
      this.windLinePositions[posIdx + 5] = seg.to[2];

      const speed = Math.sqrt(
        seg.speed[0] * seg.speed[0] +
        seg.speed[1] * seg.speed[1] +
        seg.speed[2] * seg.speed[2]
      );
      const speedNorm = Math.min(speed / 10, 1);

      const hue = 0.55 - speedNorm * 0.45;
      const color = new THREE.Color();
      color.setHSL(hue, 1.0, 0.4 + speedNorm * 0.3);

      const alpha = seg.alpha;
      this.windLineColors[posIdx] = color.r * alpha;
      this.windLineColors[posIdx + 1] = color.g * alpha;
      this.windLineColors[posIdx + 2] = color.b * alpha;
      this.windLineColors[posIdx + 3] = color.r * alpha * 1.1;
      this.windLineColors[posIdx + 4] = color.g * alpha * 1.1;
      this.windLineColors[posIdx + 5] = color.b * alpha * 1.1;
    }

    for (let i = numSegments; i < maxSegments; i++) {
      const posIdx = i * 6;
      this.windLinePositions[posIdx] = 0;
      this.windLinePositions[posIdx + 1] = -1000;
      this.windLinePositions[posIdx + 2] = 0;
      this.windLinePositions[posIdx + 3] = 0;
      this.windLinePositions[posIdx + 4] = -1000;
      this.windLinePositions[posIdx + 5] = 0;
      this.windLineColors[posIdx] = 0;
      this.windLineColors[posIdx + 1] = 0;
      this.windLineColors[posIdx + 2] = 0;
      this.windLineColors[posIdx + 3] = 0;
      this.windLineColors[posIdx + 4] = 0;
      this.windLineColors[posIdx + 5] = 0;
    }

    this.windLineGeo.attributes.position.needsUpdate = true;
    this.windLineGeo.attributes.color.needsUpdate = true;
    this.windLineGeo.setDrawRange(0, numSegments * 2);
  }

  setSolver(solver, windParticles) {
    this.solver = solver;
    this.windParticles = windParticles;
    this.setupWindVisuals();
  }

  animate() {
    if (this.animating) return;
    this.animating = true;

    const animate = () => {
      if (!this.animating) return;
      requestAnimationFrame(animate);

      const dt = Math.min(this.clock.getDelta(), 0.033);

      if (this.solver) {
        this.solver.step();
        this.windParticles.update(this.solver.dt);
        const segments = this.windParticles.getLineSegments();
        this.updateWindVisuals(segments);
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  stop() {
    this.animating = false;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
