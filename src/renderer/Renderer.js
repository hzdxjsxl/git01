export class Renderer {
  constructor(canvas, pixelSize = 4) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pixelSize = pixelSize;
    this.imageData = null;
    this.bgColor = 0xFF0a0a0f;
  }

  setPixelSize(size) {
    this.pixelSize = size;
  }

  getPixelSize() {
    return this.pixelSize;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  decodeColor(color) {
    return {
      a: (color >> 24) & 0xFF,
      r: (color >> 16) & 0xFF,
      g: (color >> 8) & 0xFF,
      b: color & 0xFF,
    };
  }

  render(grid) {
    const width = grid.width;
    const height = grid.height;
    
    this.canvas.width = width * this.pixelSize;
    this.canvas.height = height * this.pixelSize;
    
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = width;
    scaledCanvas.height = height;
    const scaledCtx = scaledCanvas.getContext('2d');
    const imageData = scaledCtx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const type = grid.getType(x, y);
        const idx = (y * width + x) * 4;
        
        if (type === 0) {
          data[idx] = 10;
          data[idx + 1] = 10;
          data[idx + 2] = 15;
          data[idx + 3] = 255;
        } else {
          const color = grid.getColor(x, y);
          const decoded = this.decodeColor(color);
          data[idx] = decoded.r;
          data[idx + 1] = decoded.g;
          data[idx + 2] = decoded.b;
          data[idx + 3] = 255;
        }
      }
    }
    
    scaledCtx.putImageData(imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(scaledCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }
}
