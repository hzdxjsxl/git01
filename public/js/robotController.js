class RobotController {
  constructor(robotMesh, data, pathfinder) {
    this.mesh = robotMesh;
    this.data = data;
    this.id = data.id;
    this.pathfinder = pathfinder;
    
    this.currentPath = [];
    this.pathIndex = 0;
    this.isMoving = false;
    this.speed = 3;
    this.targetPosition = null;
    
    this.initialPosition = { x: data.x, z: data.z };
    this.onPathComplete = null;
    this.onCollision = null;
    
    this.animationTime = 0;
    this.bobOffset = 0;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  getPosition() {
    return {
      x: this.mesh.position.x,
      z: this.mesh.position.z
    };
  }

  getGridPosition() {
    return {
      x: Math.round(this.mesh.position.x),
      z: Math.round(this.mesh.position.z)
    };
  }

  moveTo(targetX, targetZ) {
    const currentPos = this.getGridPosition();
    this.currentPath = this.pathfinder.findPath(
      currentPos.x, currentPos.z,
      targetX, targetZ,
      this.id
    );

    if (!this.currentPath || this.currentPath.length === 0) {
      return { success: false, message: '无法找到路径' };
    }

    this.pathIndex = 0;
    this.isMoving = true;
    this.targetPosition = { x: targetX, z: targetZ };
    
    return {
      success: true,
      path: this.currentPath,
      pathLength: this.currentPath.length
    };
  }

  stop() {
    this.isMoving = false;
    this.currentPath = [];
    this.pathIndex = 0;
    this.targetPosition = null;
  }

  reset() {
    this.stop();
    this.mesh.position.set(this.initialPosition.x, 0, this.initialPosition.z);
    this.mesh.rotation.y = 0;
    this.pathfinder.updateRobotPosition(this.id, this.initialPosition.x, this.initialPosition.z);
  }

  update(deltaTime, allRobots = []) {
    this.animationTime += deltaTime;
    this.bobOffset = Math.sin(this.animationTime * 3) * 0.02;

    if (this.mesh.userData.light) {
      const intensity = 0.5 + Math.sin(this.animationTime * 5) * 0.3;
      this.mesh.userData.light.material.opacity = 0.5 + intensity * 0.5;
    }

    if (!this.isMoving || this.currentPath.length === 0) {
      return;
    }

    if (this.pathIndex >= this.currentPath.length) {
      this.onArrive();
      return;
    }

    const target = this.currentPath[this.pathIndex];
    const currentPos = this.mesh.position;
    
    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.05) {
      this.pathIndex++;
      this.pathfinder.updateRobotPosition(this.id, target.x, target.z);
      return;
    }

    const moveSpeed = this.speed * deltaTime;
    const moveX = (dx / distance) * Math.min(moveSpeed, distance);
    const moveZ = (dz / distance) * Math.min(moveSpeed, distance);

    const newX = currentPos.x + moveX;
    const newZ = currentPos.z + moveZ;

    const collisionCheck = this.pathfinder.checkCollision(
      this.id, newX, newZ,
      allRobots.filter(r => r.id !== this.id).map(r => ({
        id: r.id,
        x: r.controller.getPosition().x,
        z: r.controller.getPosition().z
      }))
    );

    if (collisionCheck.collision) {
      if (this.onCollision) {
        this.onCollision(collisionCheck);
      }
      this.isMoving = false;
      return;
    }

    this.mesh.position.x = newX;
    this.mesh.position.z = newZ;
    this.mesh.position.y = this.bobOffset;

    const targetRotation = Math.atan2(dx, dz);
    const currentRotation = this.mesh.rotation.y;
    let rotationDiff = targetRotation - currentRotation;
    
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    this.mesh.rotation.y += rotationDiff * Math.min(deltaTime * 8, 1);

    if (this.mesh.userData.wheels) {
      const wheelRotation = moveSpeed * 5;
      this.mesh.userData.wheels.forEach(wheel => {
        wheel.rotation.x += wheelRotation;
      });
    }
  }

  onArrive() {
    this.isMoving = false;
    this.currentPath = [];
    this.pathIndex = 0;
    
    if (this.targetPosition) {
      this.mesh.position.x = this.targetPosition.x;
      this.mesh.position.z = this.targetPosition.z;
      this.pathfinder.updateRobotPosition(
        this.id,
        this.targetPosition.x,
        this.targetPosition.z
      );
    }

    if (this.onPathComplete) {
      this.onPathComplete();
    }
  }

  getPathInfo() {
    if (!this.isMoving || this.currentPath.length === 0) {
      return null;
    }
    return {
      currentStep: this.pathIndex,
      totalSteps: this.currentPath.length,
      target: this.targetPosition,
      remaining: this.currentPath.length - this.pathIndex
    };
  }
}
