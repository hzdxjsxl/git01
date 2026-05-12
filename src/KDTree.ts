import { SensorPoint } from './types';

interface KDNode {
  point: SensorPoint;
  left: KDNode | null;
  right: KDNode | null;
  axis: number;
}

interface NeighborResult {
  point: SensorPoint;
  distance: number;
}

export class KDTree {
  private root: KDNode | null = null;
  private points: SensorPoint[] = [];
  private dimensions = 2;

  constructor(points: SensorPoint[]) {
    this.points = [...points];
    this.build();
  }

  private build(): void {
    if (this.points.length === 0) {
      this.root = null;
      return;
    }

    const indices = new Array(this.points.length).fill(0).map((_, i) => i);
    this.root = this.buildTree(indices, 0);
  }

  private buildTree(indices: number[], depth: number): KDNode | null {
    if (indices.length === 0) {
      return null;
    }

    const axis = depth % this.dimensions;

    indices.sort((a, b) => {
      const valA = axis === 0 ? this.points[a].longitude : this.points[a].latitude;
      const valB = axis === 0 ? this.points[b].longitude : this.points[b].latitude;
      return valA - valB;
    });

    const medianIdx = Math.floor(indices.length / 2);
    const pointIdx = indices[medianIdx];

    const leftIndices = indices.slice(0, medianIdx);
    const rightIndices = indices.slice(medianIdx + 1);

    return {
      point: this.points[pointIdx],
      left: this.buildTree(leftIndices, depth + 1),
      right: this.buildTree(rightIndices, depth + 1),
      axis
    };
  }

  private distanceSq(
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  nearest(x: number, y: number): NeighborResult | null {
    if (!this.root) return null;

    let best: NeighborResult = {
      point: this.root.point,
      distance: this.distanceSq(x, y, this.root.point.longitude, this.root.point.latitude)
    };

    const search = (node: KDNode | null, depth: number): void => {
      if (!node) return;

      const axis = depth % this.dimensions;
      const nodeX = node.point.longitude;
      const nodeY = node.point.latitude;

      const distSq = this.distanceSq(x, y, nodeX, nodeY);
      if (distSq < best.distance) {
        best = { point: node.point, distance: distSq };
      }

      const goLeft = axis === 0 ? x < nodeX : y < nodeY;
      const nearBranch = goLeft ? node.left : node.right;
      const farBranch = goLeft ? node.right : node.left;

      search(nearBranch, depth + 1);

      const planeDist = axis === 0 ? (x - nodeX) : (y - nodeY);
      const planeDistSq = planeDist * planeDist;

      if (planeDistSq < best.distance) {
        search(farBranch, depth + 1);
      }
    };

    search(this.root, 0);

    return {
      point: best.point,
      distance: Math.sqrt(best.distance)
    };
  }

  nearestK(x: number, y: number, k: number): NeighborResult[] {
    if (!this.root || k <= 0) return [];

    const results: NeighborResult[] = [];

    const search = (node: KDNode | null, depth: number): void => {
      if (!node) return;

      const axis = depth % this.dimensions;
      const nodeX = node.point.longitude;
      const nodeY = node.point.latitude;

      const distSq = this.distanceSq(x, y, nodeX, nodeY);

      if (results.length < k) {
        results.push({ point: node.point, distance: distSq });
        if (results.length === k) {
          this.heapify(results);
        }
      } else if (distSq < results[0].distance) {
        results[0] = { point: node.point, distance: distSq };
        this.siftDown(results, 0);
      }

      const goLeft = axis === 0 ? x < nodeX : y < nodeY;
      const nearBranch = goLeft ? node.left : node.right;
      const farBranch = goLeft ? node.right : node.left;

      search(nearBranch, depth + 1);

      const planeDist = axis === 0 ? (x - nodeX) : (y - nodeY);
      const planeDistSq = planeDist * planeDist;

      if (results.length < k || planeDistSq < results[0].distance) {
        search(farBranch, depth + 1);
      }
    };

    search(this.root, 0);

    results.sort((a, b) => a.distance - b.distance);

    return results.map(r => ({
      point: r.point,
      distance: Math.sqrt(r.distance)
    }));
  }

  range(x: number, y: number, radius: number): NeighborResult[] {
    if (!this.root) return [];

    const radiusSq = radius * radius;
    const results: NeighborResult[] = [];

    const search = (node: KDNode | null, depth: number): void => {
      if (!node) return;

      const axis = depth % this.dimensions;
      const nodeX = node.point.longitude;
      const nodeY = node.point.latitude;

      const distSq = this.distanceSq(x, y, nodeX, nodeY);
      if (distSq <= radiusSq) {
        results.push({
          point: node.point,
          distance: Math.sqrt(distSq)
        });
      }

      const planeDist = axis === 0 ? (x - nodeX) : (y - nodeY);
      const planeDistSq = planeDist * planeDist;

      const goLeft = axis === 0 ? x < nodeX : y < nodeY;
      const nearBranch = goLeft ? node.left : node.right;
      const farBranch = goLeft ? node.right : node.left;

      search(nearBranch, depth + 1);

      if (planeDistSq <= radiusSq) {
        search(farBranch, depth + 1);
      }
    };

    search(this.root, 0);

    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  private heapify(arr: NeighborResult[]): void {
    const n = arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      this.siftDown(arr, i);
    }
  }

  private siftDown(arr: NeighborResult[], i: number): void {
    const n = arr.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;

      if (left < n && arr[left].distance > arr[largest].distance) {
        largest = left;
      }
      if (right < n && arr[right].distance > arr[largest].distance) {
        largest = right;
      }

      if (largest === i) break;

      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      i = largest;
    }
  }

  getPoints(): SensorPoint[] {
    return [...this.points];
  }

  size(): number {
    return this.points.length;
  }
}
