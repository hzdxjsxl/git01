export interface Vehicle {
  id: number;
  x: number;
  y: number;
  speed: number;
  heading: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_OBJECTS = 10;
const MAX_LEVELS = 5;

export class QuadTree {
  private level: number;
  private objects: Vehicle[];
  private bounds: BoundingBox;
  private nodes: QuadTree[] | null;

  constructor(bounds: BoundingBox, level: number = 0) {
    this.level = level;
    this.bounds = bounds;
    this.objects = [];
    this.nodes = null;
  }

  private split(): void {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes = [
      new QuadTree({ x: x + subWidth, y, width: subWidth, height: subHeight }, this.level + 1),
      new QuadTree({ x, y, width: subWidth, height: subHeight }, this.level + 1),
      new QuadTree({ x, y: y + subHeight, width: subWidth, height: subHeight }, this.level + 1),
      new QuadTree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.level + 1),
    ];
  }

  private getIndex(vehicle: Vehicle): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const topQuadrant = vehicle.y < horizontalMidpoint && vehicle.y < horizontalMidpoint;
    const bottomQuadrant = vehicle.y > horizontalMidpoint;

    if (vehicle.x < verticalMidpoint) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    } else if (vehicle.x > verticalMidpoint) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }

    return index;
  }

  insert(vehicle: Vehicle): void {
    if (this.nodes) {
      const index = this.getIndex(vehicle);
      if (index !== -1) {
        this.nodes[index].insert(vehicle);
        return;
      }
    }

    this.objects.push(vehicle);

    if (this.objects.length > MAX_OBJECTS && this.level < MAX_LEVELS) {
      if (!this.nodes) {
        this.split();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes![index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  retrieve(vehicle: Vehicle, radius: number): Vehicle[] {
    const searchBox: BoundingBox = {
      x: vehicle.x - radius,
      y: vehicle.y - radius,
      width: radius * 2,
      height: radius * 2,
    };
    return this.retrieveInternal(searchBox, []);
  }

  private retrieveInternal(range: BoundingBox, found: Vehicle[]): Vehicle[] {
    if (!this.intersects(range, this.bounds)) {
      return found;
    }

    for (const obj of this.objects) {
      if (this.isPointInRange(obj, range)) {
        found.push(obj);
      }
    }

    if (this.nodes) {
      for (const node of this.nodes) {
        node.retrieveInternal(range, found);
      }
    }

    return found;
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private isPointInRange(point: Vehicle, range: BoundingBox): boolean {
    return point.x >= range.x && point.x <= range.x + range.width && point.y >= range.y && point.y <= range.y + range.height;
  }

  clear(): void {
    this.objects = [];
    if (this.nodes) {
      for (const node of this.nodes) {
        node.clear();
      }
      this.nodes = null;
    }
  }
}
