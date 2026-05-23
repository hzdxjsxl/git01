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
    this.windLinePositions = null;
    this.windLineColors = null;
    this.clock = null;
    this.solver = null;
    this.windParticles = null;
    this.animating = false;
    this._lastTime = 0;
    this._frameAccumulator = 0;
    this._fixedDt = 1 / 60;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 250, 650);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 2000);
    this.camera.position.set(200, 130, 220);
    this.camera.lookAt(0, 60, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
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
    const ambient = new THREE.AmbientLight(0x404060, 0.65);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(180, 220, 120);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 700;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -250;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.35);
    fillLight.position.set(-120, 90, -100);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6644, 0.25);
    rimLight.position.set(-50, 70, 160);
    this.scene.add(rimLight);
  }

  addGround() {
    const groundGeo = new THREE.PlaneGeometry(900, 900);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.92,
      metalness: 0.08
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(700, 70, 0x222244, 0x1a1a30);
    gridHelper.position.y = -19.9;
    this.scene.add(gridHelper);
  }

  addWindArrows() {
    const arrowGroup = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const dir = new THREE.Vector3(1, 0, 0);
      const origin = new THREE.Vector3(-160, 10 + i * 20, -55 + i * 11);
      const arrow = new THREE.ArrowHelper(dir, origin, 35, 0x00ffaa, 10, 5);
      arrowGroup.add(arrow);
    }
    this.scene.add(arrowGroup);
  }

  addBoundingBox() {
    const boxGeo = new THREE.BoxGeometry(240, 280, 190);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: 0x334466,
      transparent: true,
      opacity: 0.25
    }));
    line.position.set(0, 95, 0);
    this.scene.add(line);
  }

  loadBuilding(data) {
    if (this.buildingMesh) {
      this.scene.remove(this.buildingMesh);
    }

    const { vertices, faces } = data;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(faces.length * 3 * 3);

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
      roughness: 0.38,
      metalness: 0.65,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x6688bb,
      transparent: true,
      opacity: 0.55
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);

    this.buildingMesh = mesh;
    this.scene.add(mesh);

    return data.bounds;
  }

  setupWindVisuals() {
    const maxSegments = this.windParticles ? this.windParticles.maxSegments : 200000;
    this.windLinePositions = new Float32Array(maxSegments * 6);
    this.windLineColors = new Float32Array(maxSegments * 6);

    this.windLineGeo = new THREE.BufferGeometry();
    this.windLineGeo.setAttribute('position', new THREE.BufferAttribute(this.windLinePositions, 3));
    this.windLineGeo.setAttribute('color', new THREE.BufferAttribute(this.windLineColors, 3));

    this.windLineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });

    this.windLines = new THREE.LineSegments(this.windLineGeo, this.windLineMaterial);
    this.windLines.frustumCulled = false;
    this.scene.add(this.windLines);
  }

  updateWindVisuals() {
    if (!this.windLineGeo || !this.windParticles) return;

    const lineData = this.windParticles.getLineData();
    const srcPositions = lineData.positions;
    const srcColors = lineData.colors;
    const count = lineData.count;

    const dstPositions = this.windLinePositions;
    const dstColors = this.windLineColors;

    const copyLen = Math.min(count * 6, dstPositions.length);
    dstPositions.set(srcPositions.subarray(0, copyLen));
    dstColors.set(srcColors.subarray(0, copyLen));

    this.windLineGeo.attributes.position.needsUpdate = true;
    this.windLineGeo.attributes.color.needsUpdate = true;
    this.windLineGeo.setDrawRange(0, count * 2);
  }

  setSolver(solver, windParticles) {
    this.solver = solver;
    this.windParticles = windParticles;
    this.setupWindVisuals();
  }

  animate() {
    if (this.animating) return;
    this.animating = true;
    this._lastTime = performance.now();

    const animate = () => {
      if (!this.animating) return;
      requestAnimationFrame(animate);

      const now = performance.now();
      const frameTime = Math.min((now - this._lastTime) / 1000, 0.1);
      this._lastTime = now;

      if (this.solver && this.windParticles) {
        this._frameAccumulator += frameTime;

        let subSteps = 0;
        while (this._frameAccumulator >= this._fixedDt && subSteps < 3) {
          this.solver.step();
          this.windParticles.update(this.solver.dt);
          this._frameAccumulator -= this._fixedDt;
          subSteps++;
        }

        this.updateWindVisuals();
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
