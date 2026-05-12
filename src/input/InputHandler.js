export class InputHandler {
  constructor(canvas, pixelSize) {
    this.canvas = canvas;
    this.pixelSize = pixelSize;
    this.isMouseDown = false;
    this.isRightMouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.brushSize = 6;
    this.currentType = 1;
    this.onBrush = null;
    this.onErase = null;
    this.onClear = null;
    this.onTypeChange = null;
    
    this.init();
  }

  setPixelSize(size) {
    this.pixelSize = size;
  }

  setBrushSize(size) {
    this.brushSize = Math.max(1, size);
  }

  getBrushSize() {
    return this.brushSize;
  }

  setCurrentType(type) {
    this.currentType = type;
    if (this.onTypeChange) {
      this.onTypeChange(type);
    }
  }

  getCurrentType() {
    return this.currentType;
  }

  getGridPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.pixelSize);
    const y = Math.floor((clientY - rect.top) / this.pixelSize);
    return { x, y };
  }

  init() {
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
      }
      const pos = this.getGridPos(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.applyBrush(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getGridPos(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      
      if (this.isMouseDown || this.isRightMouseDown) {
        this.applyBrush(pos.x, pos.y);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case '1':
          this.setCurrentType(1);
          break;
        case '2':
          this.setCurrentType(2);
          break;
        case '3':
          this.setCurrentType(3);
          break;
        case 'c':
          if (this.onClear) this.onClear();
          break;
        case '=':
        case '+':
          this.setBrushSize(this.brushSize + 1);
          break;
        case '-':
          this.setBrushSize(this.brushSize - 1);
          break;
      }
    });
  }

  applyBrush(x, y) {
    const size = this.brushSize;
    for (let dx = -size; dx <= size; dx++) {
      for (let dy = -size; dy <= size; dy++) {
        if (dx * dx + dy * dy <= size * size) {
          const type = this.isRightMouseDown ? 0 : this.currentType;
          if (this.isRightMouseDown) {
            if (this.onErase) this.onErase(x + dx, y + dy);
          } else {
            if (this.onBrush) this.onBrush(x + dx, y + dy, type);
          }
        }
      }
    }
  }
}
