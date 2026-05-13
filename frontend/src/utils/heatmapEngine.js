const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 68;
const GRID_SIZE = 1;
const MAX_HISTORY = 600;

export class HeatmapEngine {
  constructor() {
    this.gridWidth = Math.ceil(PITCH_WIDTH / GRID_SIZE);
    this.gridHeight = Math.ceil(PITCH_HEIGHT / GRID_SIZE);
    this.densityGrid = new Float32Array(this.gridWidth * this.gridHeight);
    this.history = [];
    this.decayRate = 0.002;
    this.radius = 8;
    this.intensity = 0.8;
  }

  addPoint(x, y, weight = 1) {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);

    this.history.push({ x: gridX, y: gridY, weight, timestamp: Date.now() });

    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    for (let dx = -this.radius; dx <= this.radius; dx++) {
      for (let dy = -this.radius; dy <= this.radius; dy++) {
        const gx = gridX + dx;
        const gy = gridY + dy;

        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= this.radius) {
            const factor = (1 - dist / this.radius) * this.intensity * weight;
            const idx = gy * this.gridWidth + gx;
            this.densityGrid[idx] += factor;
          }
        }
      }
    }
  }

  applyDecay() {
    for (let i = 0; i < this.densityGrid.length; i++) {
      if (this.densityGrid[i] > 0) {
        this.densityGrid[i] *= (1 - this.decayRate);
        if (this.densityGrid[i] < 0.001) {
          this.densityGrid[i] = 0;
        }
      }
    }
  }

  clear() {
    this.densityGrid.fill(0);
    this.history = [];
  }

  getMaxDensity() {
    let max = 0;
    for (let i = 0; i < this.densityGrid.length; i++) {
      if (this.densityGrid[i] > max) {
        max = this.densityGrid[i];
      }
    }
    return max || 1;
  }

  render(ctx, width, height) {
    this.applyDecay();

    const cellWidth = width / this.gridWidth;
    const cellHeight = height / this.gridHeight;
    const maxDensity = this.getMaxDensity();

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let gy = 0; gy < this.gridHeight; gy++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const density = this.densityGrid[gy * this.gridWidth + gx];
        if (density <= 0) continue;

        const normalized = Math.min(density / maxDensity, 1);
        const color = this.getColor(normalized);

        const startX = Math.floor(gx * cellWidth);
        const startY = Math.floor(gy * cellHeight);
        const endX = Math.min(startX + Math.ceil(cellWidth), width);
        const endY = Math.min(startY + Math.ceil(cellHeight), height);

        for (let py = startY; py < endY; py++) {
          for (let px = startX; px < endX; px++) {
            const idx = (py * width + px) * 4;
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = color.a;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  getColor(value) {
    if (value < 0.25) {
      return this.interpolateColor({ r: 0, g: 0, b: 255, a: 0 }, { r: 0, g: 100, b: 255, a: 150 }, value * 4);
    } else if (value < 0.5) {
      return this.interpolateColor({ r: 0, g: 100, b: 255, a: 150 }, { r: 0, g: 255, b: 255, a: 200 }, (value - 0.25) * 4);
    } else if (value < 0.75) {
      return this.interpolateColor({ r: 0, g: 255, b: 255, a: 200 }, { r: 255, g: 255, b: 0, a: 230 }, (value - 0.5) * 4);
    } else {
      return this.interpolateColor({ r: 255, g: 255, b: 0, a: 230 }, { r: 255, g: 50, b: 0, a: 255 }, (value - 0.75) * 4);
    }
  }

  interpolateColor(c1, c2, t) {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
      a: Math.round(c1.a + (c2.a - c1.a) * t)
    };
  }
}
