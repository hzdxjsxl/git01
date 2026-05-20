class WarehouseApp {
  constructor() {
    this.api = new WarehouseAPI();
    this.sceneManager = null;
    this.pathfinder = null;
    this.robots = [];
    this.warehouseData = null;
    this.clock = new THREE.Clock();
    this.selectedRobotIndex = 0;
    this.speed = 5;
    
    this.init();
  }

  async init() {
    try {
      this.warehouseData = await this.api.getWarehouseData();
      
      this.sceneManager = new SceneManager('canvas-container');
      this.sceneManager.init();
      
      this.pathfinder = new Pathfinder(this.warehouseData.gridSize);
      this.pathfinder.setObstacles(this.warehouseData.shelves);
      
      this.createShelves();
      this.createRobots();
      
      this.setupUI();
      
      this.sceneManager.setAnimationCallback(() => this.update());
      
      setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
      }, 500);
      
    } catch (error) {
      console.error('初始化失败:', error);
      alert('初始化失败，请刷新页面重试');
    }
  }

  createShelves() {
    this.warehouseData.shelves.forEach(shelfData => {
      const shelf = ModelFactory.createShelf(shelfData);
      this.sceneManager.addShelf(shelf);
    });
    
    document.getElementById('shelfCount').textContent = this.warehouseData.shelves.length;
  }

  createRobots() {
    this.warehouseData.robots.forEach((robotData, index) => {
      const robotMesh = ModelFactory.createRobot(robotData);
      const controller = new RobotController(robotMesh, robotData, this.pathfinder);
      
      controller.setSpeed(this.speed);
      controller.onPathComplete = () => this.onRobotPathComplete(index);
      controller.onCollision = (collision) => this.onRobotCollision(index, collision);
      
      this.pathfinder.updateRobotPosition(robotData.id, robotData.x, robotData.z);
      
      this.robots.push({
        id: robotData.id,
        mesh: robotMesh,
        controller: controller,
        data: robotData
      });
      
      this.sceneManager.addRobot(robotMesh);
    });
    
    document.getElementById('robotCount').textContent = this.robots.length;
  }

  setupUI() {
    const robotSelect = document.getElementById('robotSelect');
    robotSelect.addEventListener('change', (e) => {
      this.selectedRobotIndex = parseInt(e.target.value);
    });

    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    speedSlider.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value);
      speedValue.textContent = this.speed;
      this.robots.forEach(robot => robot.controller.setSpeed(this.speed));
    });

    document.getElementById('moveBtn').addEventListener('click', () => {
      this.moveSelectedRobot();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetRobots();
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
      this.setRandomTarget();
    });
  }

  moveSelectedRobot() {
    const targetX = parseInt(document.getElementById('targetX').value);
    const targetZ = parseInt(document.getElementById('targetZ').value);
    const robot = this.robots[this.selectedRobotIndex];
    
    if (robot.controller.isMoving) {
      this.updatePathInfo('机器人正在移动中，请等待...');
      return;
    }

    this.sceneManager.clearObjects('pathLines');
    this.sceneManager.clearObjects('markers');

    const result = robot.controller.moveTo(targetX, targetZ);
    
    if (result.success) {
      const pathLine = ModelFactory.createPathLine(
        result.path,
        this.selectedRobotIndex === 0 ? 0xff4444 : 0x44ff44
      );
      this.sceneManager.addPathLine(pathLine);
      
      const marker = ModelFactory.createTargetMarker(
        targetX, targetZ,
        this.selectedRobotIndex === 0 ? 0xff4444 : 0x44ff44
      );
      this.sceneManager.addMarker(marker);
      
      this.updatePathInfo(`
        <div class="path-detail"><strong>机器人:</strong> ${this.selectedRobotIndex + 1}</div>
        <div class="path-detail"><strong>路径长度:</strong> ${result.pathLength} 步</div>
        <div class="path-detail"><strong>目标位置:</strong> (${targetX}, ${targetZ})</div>
        <div class="path-detail"><strong>状态:</strong> 移动中...</div>
      `);
    } else {
      this.updatePathInfo(`
        <div class="path-detail" style="color: #ff6b6b;"><strong>错误:</strong> ${result.message}</div>
        <div class="path-detail">目标位置可能被货架占用或无法到达</div>
      `);
    }
  }

  resetRobots() {
    this.robots.forEach(robot => {
      robot.controller.reset();
    });
    this.sceneManager.clearObjects('pathLines');
    this.sceneManager.clearObjects('markers');
    this.updatePathInfo('<p>所有机器人已重置到初始位置</p>');
  }

  setRandomTarget() {
    const gridSize = this.warehouseData.gridSize;
    let targetX, targetZ;
    let attempts = 0;
    
    do {
      targetX = Math.floor(Math.random() * (gridSize - 2)) + 1;
      targetZ = Math.floor(Math.random() * (gridSize - 2)) + 1;
      attempts++;
    } while (!this.pathfinder.isWalkable(targetX, targetZ) && attempts < 100);
    
    document.getElementById('targetX').value = targetX;
    document.getElementById('targetZ').value = targetZ;
  }

  onRobotPathComplete(robotIndex) {
    const info = this.robots[robotIndex].controller.getPathInfo();
    if (robotIndex === this.selectedRobotIndex) {
      this.updatePathInfo(`
        <div class="path-detail"><strong>机器人:</strong> ${robotIndex + 1}</div>
        <div class="path-detail" style="color: #4ade80;"><strong>状态:</strong> 已到达目的地!</div>
      `);
      
      setTimeout(() => {
        this.sceneManager.clearObjects('pathLines');
        this.sceneManager.clearObjects('markers');
      }, 2000);
    }
  }

  onRobotCollision(robotIndex, collision) {
    const collisionIndicator = ModelFactory.createCollisionIndicator(
      this.robots[robotIndex].controller.getPosition().x,
      this.robots[robotIndex].controller.getPosition().z
    );
    this.sceneManager.addMarker(collisionIndicator);
    
    setTimeout(() => {
      this.sceneManager.objects.markers = this.sceneManager.objects.markers.filter(
        m => m !== collisionIndicator
      );
      this.sceneManager.scene.remove(collisionIndicator);
    }, 2000);
    
    if (robotIndex === this.selectedRobotIndex) {
      const collisionType = collision.type === 'shelf' ? '货架' : `机器人 ${collision.with}`;
      this.updatePathInfo(`
        <div class="path-detail" style="color: #ff6b6b;"><strong>碰撞警告!</strong></div>
        <div class="path-detail">检测到与 ${collisionType} 的潜在碰撞</div>
        <div class="path-detail">机器人已停止移动</div>
      `);
    }
  }

  updatePathInfo(html) {
    document.getElementById('pathInfo').innerHTML = html;
  }

  update() {
    const deltaTime = this.clock.getDelta();
    
    this.robots.forEach(robot => {
      robot.controller.update(deltaTime, this.robots);
    });

    this.sceneManager.objects.markers.forEach(marker => {
      if (marker.userData && marker.userData.ring) {
        marker.userData.ring.rotation.z += deltaTime * 2;
      }
      if (marker.userData && marker.userData.sphere) {
        marker.userData.sphere.position.y = 2.1 + Math.sin(this.clock.elapsedTime * 3) * 0.1;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WarehouseApp();
});
