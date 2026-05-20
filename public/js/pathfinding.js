class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(item, priority) {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.items.shift().item;
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

class PathNode {
  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.g = 0;
    this.h = 0;
    this.f = 0;
    this.parent = null;
  }

  equals(other) {
    return this.x === other.x && this.z === other.z;
  }

  toString() {
    return `${this.x},${this.z}`;
  }
}

class Pathfinder {
  constructor(gridSize) {
    this.gridSize = gridSize;
    this.obstacles = new Set();
    this.robotPositions = new Map();
  }

  setObstacles(shelves) {
    this.obstacles.clear();
    shelves.forEach(shelf => {
      const x = Math.round(shelf.x);
      const z = Math.round(shelf.z);
      this.obstacles.add(`${x},${z}`);
    });
  }

  updateRobotPosition(robotId, x, z) {
    this.robotPositions.set(robotId, { x: Math.round(x), z: Math.round(z) });
  }

  removeRobotPosition(robotId) {
    this.robotPositions.delete(robotId);
  }

  isWalkable(x, z, excludeRobotId = null) {
    if (x < 0 || x >= this.gridSize || z < 0 || z >= this.gridSize) {
      return false;
    }
    if (this.obstacles.has(`${x},${z}`)) {
      return false;
    }
    for (const [id, pos] of this.robotPositions) {
      if (id !== excludeRobotId && pos.x === x && pos.z === z) {
        return false;
      }
    }
    return true;
  }

  getNeighbors(node, excludeRobotId) {
    const neighbors = [];
    const directions = [
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 },
      { x: 1, z: -1 },
      { x: 1, z: 1 },
      { x: -1, z: 1 },
      { x: -1, z: -1 }
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newZ = node.z + dir.z;
      
      if (this.isWalkable(newX, newZ, excludeRobotId)) {
        if (Math.abs(dir.x) === 1 && Math.abs(dir.z) === 1) {
          if (!this.isWalkable(node.x + dir.x, node.z, excludeRobotId) ||
              !this.isWalkable(node.x, node.z + dir.z, excludeRobotId)) {
            continue;
          }
        }
        neighbors.push(new PathNode(newX, newZ));
      }
    }
    return neighbors;
  }

  heuristic(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    return Math.max(dx, dz) + 0.4 * Math.min(dx, dz);
  }

  findPath(startX, startZ, endX, endZ, robotId = null) {
    const start = new PathNode(Math.round(startX), Math.round(startZ));
    const end = new PathNode(Math.round(endX), Math.round(endZ));

    if (!this.isWalkable(end.x, end.z, robotId)) {
      console.warn(`目标位置 (${end.x}, ${end.z}) 不可达`);
      return null;
    }

    if (start.equals(end)) {
      return [{ x: start.x, z: start.z }];
    }

    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const openMap = new Map();

    start.g = 0;
    start.h = this.heuristic(start, end);
    start.f = start.g + start.h;
    openSet.enqueue(start, start.f);
    openMap.set(start.toString(), start);

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      openMap.delete(current.toString());

      if (current.equals(end)) {
        return this.reconstructPath(current);
      }

      closedSet.add(current.toString());

      const neighbors = this.getNeighbors(current, robotId);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor.toString())) {
          continue;
        }

        const dx = Math.abs(neighbor.x - current.x);
        const dz = Math.abs(neighbor.z - current.z);
        const moveCost = (dx === 1 && dz === 1) ? 1.4 : 1;
        const tentativeG = current.g + moveCost;

        const existingNode = openMap.get(neighbor.toString());
        
        if (!existingNode || tentativeG < existingNode.g) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!existingNode) {
            openSet.enqueue(neighbor, neighbor.f);
            openMap.set(neighbor.toString(), neighbor);
          }
        }
      }
    }

    console.warn(`无法找到从 (${start.x}, ${start.z}) 到 (${end.x}, ${end.z}) 的路径`);
    return null;
  }

  reconstructPath(node) {
    const path = [];
    let current = node;
    while (current) {
      path.unshift({ x: current.x, z: current.z });
      current = current.parent;
    }
    return this.smoothPath(path);
  }

  smoothPath(path) {
    if (path.length < 3) return path;
    
    const smoothed = [path[0]];
    let i = 0;
    
    while (i < path.length - 1) {
      let j = path.length - 1;
      while (j > i + 1) {
        if (this.hasLineOfSight(path[i], path[j])) {
          smoothed.push(path[j]);
          i = j;
          break;
        }
        j--;
      }
      if (j === i + 1) {
        smoothed.push(path[i + 1]);
        i++;
      }
    }
    
    return smoothed;
  }

  hasLineOfSight(a, b) {
    let x0 = a.x;
    let z0 = a.z;
    const x1 = b.x;
    const z1 = b.z;
    
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    
    let err = dx - dz;
    
    while (true) {
      if (x0 === x1 && z0 === z1) break;
      
      const e2 = 2 * err;
      
      if (e2 > -dz) {
        err -= dz;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        z0 += sz;
      }
      
      if (this.obstacles.has(`${x0},${z0}`)) {
        return false;
      }
    }
    
    return true;
  }

  checkCollision(robotId, x, z, otherRobots = []) {
    const gridX = Math.round(x);
    const gridZ = Math.round(z);
    
    if (this.obstacles.has(`${gridX},${gridZ}`)) {
      return { collision: true, type: 'shelf' };
    }
    
    for (const robot of otherRobots) {
      if (robot.id !== robotId) {
        const otherX = Math.round(robot.x);
        const otherZ = Math.round(robot.z);
        if (otherX === gridX && otherZ === gridZ) {
          return { collision: true, type: 'robot', with: robot.id };
        }
      }
    }
    
    return { collision: false };
  }
}
