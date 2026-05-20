class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.objects = {
      shelves: [],
      robots: [],
      pathLines: [],
      markers: [],
      obstacles: []
    };
    this.gridSize = 20;
    this.animationId = null;
    this.onAnimationFrame = null;
  }

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createControls();
    this.createLighting();
    this.createGround();
    this.createGrid();
    this.createWarehouseWalls();
    this.animate();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.Fog(0x0f172a, 30, 80);
  }

  createCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(25, 25, 25);
    this.camera.lookAt(this.gridSize / 2, 0, this.gridSize / 2);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  createControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(this.gridSize / 2, 0, this.gridSize / 2);
  }

  createLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -30;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 20, -10);
    this.scene.add(fillLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d26, 0.3);
    this.scene.add(hemisphereLight);
  }

  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.gridSize / 2 - 0.5, 0, this.gridSize / 2 - 0.5);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createGrid() {
    const gridHelper = new THREE.GridHelper(
      this.gridSize,
      this.gridSize,
      0x334155,
      0x1e293b
    );
    gridHelper.position.set(this.gridSize / 2 - 0.5, 0.01, this.gridSize / 2 - 0.5);
    this.scene.add(gridHelper);
  }

  createObstacleVisualization(obstacles) {
    this.clearObjects('obstacles');
    
    const obstacleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.15
    });

    obstacles.forEach(key => {
      const [x, z] = key.split(',').map(Number);
      const geometry = new THREE.PlaneGeometry(0.95, 0.95);
      const plane = new THREE.Mesh(geometry, obstacleMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(x, 0.02, z);
      this.objects.obstacles.push(plane);
      this.scene.add(plane);
    });
  }

  createWarehouseWalls() {
    const wallHeight = 8;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    const wallPositions = [
      { x: this.gridSize / 2 - 0.5, z: -0.5, rotY: 0 },
      { x: this.gridSize / 2 - 0.5, z: this.gridSize - 0.5, rotY: 0 },
      { x: -0.5, z: this.gridSize / 2 - 0.5, rotY: Math.PI / 2 },
      { x: this.gridSize - 0.5, z: this.gridSize / 2 - 0.5, rotY: Math.PI / 2 }
    ];

    wallPositions.forEach(pos => {
      const wallGeometry = new THREE.PlaneGeometry(this.gridSize, wallHeight);
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(pos.x, wallHeight / 2, pos.z);
      wall.rotation.y = pos.rotY;
      this.scene.add(wall);
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.5,
      roughness: 0.5
    });

    const pillarGeometry = new THREE.BoxGeometry(0.3, wallHeight, 0.3);
    const pillars = [
      [-0.5, -0.5],
      [this.gridSize - 0.5, -0.5],
      [-0.5, this.gridSize - 0.5],
      [this.gridSize - 0.5, this.gridSize - 0.5]
    ];

    pillars.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
      pillar.position.set(x, wallHeight / 2, z);
      pillar.castShadow = true;
      this.scene.add(pillar);
    });
  }

  clearObjects(type) {
    if (type === 'all') {
      Object.keys(this.objects).forEach(key => {
        this.objects[key].forEach(obj => this.scene.remove(obj));
        this.objects[key] = [];
      });
    } else if (this.objects[type]) {
      this.objects[type].forEach(obj => this.scene.remove(obj));
      this.objects[type] = [];
    }
  }

  addShelf(shelfMesh) {
    this.objects.shelves.push(shelfMesh);
    this.scene.add(shelfMesh);
  }

  addRobot(robotMesh) {
    this.objects.robots.push(robotMesh);
    this.scene.add(robotMesh);
  }

  addPathLine(line) {
    this.objects.pathLines.push(line);
    this.scene.add(line);
  }

  addMarker(marker) {
    this.objects.markers.push(marker);
    this.scene.add(marker);
  }

  setAnimationCallback(callback) {
    this.onAnimationFrame = callback;
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    if (this.onAnimationFrame) {
      this.onAnimationFrame();
    }
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}
