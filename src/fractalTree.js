export class Branch {
  constructor(start, end, depth, maxDepth) {
    this.start = { ...start };
    this.end = { ...end };
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.children = [];
    this.growthProgress = 0;
    this.isGrowing = true;
    this.growthSpeed = 0.03 + Math.random() * 0.02;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    this.angle = Math.atan2(dy, dx);
    this.length = Math.sqrt(dx * dx + dy * dy);
    
    this.baseAngle = this.angle;
    this.curvatureOffset = (Math.random() - 0.5) * 0.3;
    this.windOffset = Math.random() * Math.PI * 2;
    this.windFrequency = 0.8 + Math.random() * 0.4;
  }

  grow() {
    if (this.isGrowing) {
      this.growthProgress += this.growthSpeed;
      if (this.growthProgress >= 1) {
        this.growthProgress = 1;
        this.isGrowing = false;
        return true;
      }
    }
    return false;
  }

  getCurrentEnd(time) {
    const progress = this.growthProgress;
    const windSway = Math.sin(time * this.windFrequency + this.windOffset) * (0.02 + this.depth * 0.005);
    const depthFactor = 1 - (this.depth / this.maxDepth) * 0.3;
    const currentAngle = this.baseAngle + this.curvatureOffset * progress + windSway * depthFactor;
    
    const currentLength = this.length * progress;
    
    return {
      x: this.start.x + Math.cos(currentAngle) * currentLength,
      y: this.start.y + Math.sin(currentAngle) * currentLength,
      angle: currentAngle
    };
  }

  getWidth() {
    const maxWidth = 8;
    const minWidth = 1;
    return maxWidth - (this.depth / this.maxDepth) * (maxWidth - minWidth);
  }

  getColor() {
    const progress = this.growthProgress;
    const depthFactor = this.depth / this.maxDepth;
    
    const brown = { r: 139, g: 69, b: 19 };
    const darkBrown = { r: 101, g: 67, b: 33 };
    const green = { r: 34, g: 139, b: 34 };
    
    let targetColor;
    if (this.depth >= this.maxDepth - 2) {
      targetColor = green;
    } else {
      targetColor = depthFactor > 0.6 ? green : (Math.random() > 0.5 ? brown : darkBrown);
    }
    
    const r = Math.floor(targetColor.r * progress);
    const g = Math.floor(targetColor.g * progress);
    const b = Math.floor(targetColor.b * progress);
    const a = 0.3 + progress * 0.7;
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

export class FractalTree {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.config = {
      maxDepth: config.maxDepth || 10,
      initialLength: config.initialLength || 120,
      lengthDecay: config.lengthDecay || 0.72,
      angleSpread: config.angleSpread || Math.PI / 4,
      branchCount: config.branchCount || 2,
      randomness: config.randomness || 0.15
    };
    
    this.branches = [];
    this.branchQueue = [];
    this.time = 0;
    this.isComplete = false;
  }

  init() {
    this.branches = [];
    this.branchQueue = [];
    this.isComplete = false;
    this.time = 0;

    const rootStart = {
      x: this.canvas.width / 2,
      y: this.canvas.height
    };
    
    const rootEnd = {
      x: rootStart.x,
      y: rootStart.y - this.config.initialLength
    };

    const rootBranch = new Branch(rootStart, rootEnd, 0, this.config.maxDepth);
    this.branches.push(rootBranch);
    this.branchQueue.push(rootBranch);
  }

  spawnChildBranches(parentBranch) {
    if (parentBranch.depth >= this.config.maxDepth) return;

    const { angleSpread, lengthDecay, branchCount, randomness } = this.config;
    const currentEnd = parentBranch.getCurrentEnd(this.time);
    const newLength = parentBranch.length * lengthDecay;

    for (let i = 0; i < branchCount; i++) {
      let angle;
      if (branchCount === 1) {
        angle = currentEnd.angle + (Math.random() - 0.5) * angleSpread;
      } else {
        const baseAngle = -angleSpread / 2 + (angleSpread / (branchCount - 1)) * i;
        angle = currentEnd.angle + baseAngle + (Math.random() - 0.5) * randomness;
      }

      const childEnd = {
        x: currentEnd.x + Math.cos(angle) * newLength,
        y: currentEnd.y + Math.sin(angle) * newLength
      };

      const childBranch = new Branch(
        currentEnd,
        childEnd,
        parentBranch.depth + 1,
        this.config.maxDepth
      );

      this.branches.push(childBranch);
      this.branchQueue.push(childBranch);
    }
  }

  update() {
    this.time += 0.016;
    
    if (this.branchQueue.length === 0) {
      this.isComplete = true;
      return;
    }

    const growingCount = Math.min(3, this.branchQueue.length);
    let allDone = true;

    for (let i = 0; i < growingCount; i++) {
      const branch = this.branchQueue[i];
      if (branch.isGrowing) {
        allDone = false;
        const isComplete = branch.grow();
        if (isComplete) {
          this.spawnChildBranches(branch);
        }
      }
    }

    if (allDone && this.branchQueue.length > 0) {
      this.branchQueue.splice(0, growingCount);
    }
  }

  getBranches() {
    return this.branches;
  }

  getTime() {
    return this.time;
  }
}
