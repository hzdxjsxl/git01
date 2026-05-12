export class Grid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.types = new Uint8Array(width * height);
    this.colors = new Uint32Array(width * height);
    this.updated = new Uint8Array(width * height);
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getIndex(x, y) {
    return y * this.width + x;
  }

  getType(x, y) {
    if (!this.inBounds(x, y)) return -1;
    return this.types[this.getIndex(x, y)];
  }

  setType(x, y, type) {
    if (!this.inBounds(x, y)) return;
    this.types[this.getIndex(x, y)] = type;
  }

  getColor(x, y) {
    if (!this.inBounds(x, y)) return 0;
    return this.colors[this.getIndex(x, y)];
  }

  setColor(x, y, color) {
    if (!this.inBounds(x, y)) return;
    this.colors[this.getIndex(x, y)] = color;
  }

  isUpdated(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.updated[this.getIndex(x, y)] !== 0;
  }

  markUpdated(x, y, value = true) {
    if (!this.inBounds(x, y)) return;
    this.updated[this.getIndex(x, y)] = value ? 1 : 0;
  }

  swap(x1, y1, x2, y2) {
    const idx1 = this.getIndex(x1, y1);
    const idx2 = this.getIndex(x2, y2);
    
    const tempType = this.types[idx1];
    const tempColor = this.colors[idx1];
    
    this.types[idx1] = this.types[idx2];
    this.colors[idx1] = this.colors[idx2];
    
    this.types[idx2] = tempType;
    this.colors[idx2] = tempColor;
    
    this.updated[idx1] = 1;
    this.updated[idx2] = 1;
  }

  clearUpdated() {
    this.updated.fill(0);
  }
}
