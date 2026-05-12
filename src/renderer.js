export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
  }

  resize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGround() {
    this.ctx.fillStyle = '#1a472a';
    this.ctx.fillRect(0, this.height - 30, this.width, 30);
    
    const grassGradient = this.ctx.createLinearGradient(0, this.height - 30, 0, this.height);
    grassGradient.addColorStop(0, 'rgba(34, 139, 34, 0.3)');
    grassGradient.addColorStop(1, 'rgba(34, 139, 34, 0.1)');
    this.ctx.fillStyle = grassGradient;
    this.ctx.fillRect(0, this.height - 60, this.width, 60);
  }

  drawBranch(branch, time) {
    const currentEnd = branch.getCurrentEnd(time);
    const width = branch.getWidth();
    const color = branch.getColor();

    this.ctx.beginPath();
    this.ctx.moveTo(branch.start.x, branch.start.y);
    this.ctx.lineTo(currentEnd.x, currentEnd.y);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    if (branch.depth >= branch.maxDepth - 2 && branch.growthProgress > 0.8) {
      this.drawLeaves(currentEnd, branch);
    }
  }

  drawLeaves(position, branch) {
    const leafCount = 3;
    const leafSize = 3 + (1 - branch.depth / branch.maxDepth) * 2;
    const timeOffset = branch.windOffset;
    
    for (let i = 0; i < leafCount; i++) {
      const angle = position.angle + (i - leafCount / 2) * 0.3;
      const sway = Math.sin(timeOffset + position.angle) * 0.05;
      
      const leafX = position.x + Math.cos(angle + sway) * leafSize * 2;
      const leafY = position.y + Math.sin(angle + sway) * leafSize * 2;

      this.ctx.beginPath();
      this.ctx.arc(leafX, leafY, leafSize, 0, Math.PI * 2);
      
      const leafGradient = this.ctx.createRadialGradient(
        leafX, leafY, 0,
        leafX, leafY, leafSize
      );
      leafGradient.addColorStop(0, 'rgba(50, 205, 50, 0.8)');
      leafGradient.addColorStop(1, 'rgba(34, 139, 34, 0.4)');
      
      this.ctx.fillStyle = leafGradient;
      this.ctx.fill();
    }
  }

  draw(tree) {
    this.drawBackground();
    this.drawGround();
    
    const branches = tree.getBranches();
    const time = tree.getTime();

    for (const branch of branches) {
      this.drawBranch(branch, time);
    }
  }
}
