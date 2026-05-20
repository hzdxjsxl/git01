class PriorityQueue {
  constructor() { this.items = []; }
  enqueue(item, priority) { this.items.push({ item, priority }); this.items.sort((a, b) => a.priority - b.priority); }
  dequeue() { return this.items.shift().item; }
  isEmpty() { return this.items.length === 0; }
}

class PathNode {
  constructor(x, z) { this.x = x; this.z = z; this.g = 0; this.h = 0; this.f = 0; this.parent = null; }
  equals(other) { return this.x === other.x && this.z === other.z; }
  toString() { return `${this.x},${this.z}`; }
}

class Pathfinder {
  constructor(gridSize) {
    this.gridSize = gridSize;
    this.obstacles = new Set();
    this.shelfData = [];
    this.robotPositions = new Map();
    this.robotRadius = 0.35;
    this.safetyMargin = 0.05;
  }

  setObstacles(shelves) {
    this.obstacles.clear();
    this.shelfData = [];
    shelves.forEach(shelf => {
      this.shelfData.push({ x: shelf.x, z: shelf.z, halfWidth: shelf.width / 2, halfDepth: shelf.depth / 2 });
      const centerX = Math.round(shelf.x);
      const centerZ = Math.round(shelf.z);
      this.obstacles.add(`${centerX},