import { SensorPoint, IDWConfig } from './types';
import { KDTree } from './KDTree';

interface InterpolationCache {
  [key: string]: number;
}

export class IDWCalculator {
  private points: SensorPoint[];
  private config: IDWConfig;
  private kdTree: KDTree;
  private cache: InterpolationCache = {};
  private cacheHits = 0;
  private cacheMisses = 0;
  private enableCaching = true;

  constructor(points: SensorPoint[], config?: Partial<IDWConfig>) {
    this.points = [...points];
    this.config = {
      power: config?.power ?? 2,
      maxDistance: config?.maxDistance,
      neighborCount: config?.neighborCount ?? 12
    };
    this.kdTree = new KDTree(this.points);
  }

  private calculateDistance(
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getCacheKey(x: number, y: number): string {
    const precision = 1e-6;
    const rx = Math.round(x / precision) * precision;
    const ry = Math.round(y / precision) * precision;
    return `${rx},${ry}`;
  }

  interpolate(x: number, y: number): number {
    if (this.points.length === 0) {
      return 0;
    }

    if (this.enableCaching) {
      const cacheKey = this.getCacheKey(x, y);
      if (cacheKey in this.cache) {
        this.cacheHits++;
        return this.cache[cacheKey];
      }
      this.cacheMisses++;
    }

    const result = this.interpolateInternal(x, y);

    if (this.enableCaching) {
      const cacheKey = this.getCacheKey(x, y);
      this.cache[cacheKey] = result;
    }

    return result;
  }

  private interpolateInternal(x: number, y: number): number {
    const { power, maxDistance, neighborCount } = this.config;
    let neighbors: Array<{ point: SensorPoint; distance: number }>;

    if (maxDistance !== undefined && maxDistance > 0) {
      neighbors = this.kdTree.range(x, y, maxDistance);
    } else if (neighborCount !== undefined && neighborCount > 0) {
      neighbors = this.kdTree.nearestK(x, y, neighborCount);
    } else {
      neighbors = this.points.map(p => ({
        point: p,
        distance: this.calculateDistance(x, y, p.longitude, p.latitude)
      }));
    }

    if (neighbors.length === 0) {
      const nearest = this.kdTree.nearest(x, y);
      if (nearest) {
        return nearest.point.humidity;
      }
      return this.calculateAverage();
    }

    let weightedSum = 0;
    let weightSum = 0;

    for (const neighbor of neighbors) {
      const distance = neighbor.distance;

      if (distance === 0) {
        return neighbor.point.humidity;
      }

      const weight = 1 / Math.pow(distance, power);
      weightedSum += weight * neighbor.point.humidity;
      weightSum += weight;
    }

    if (weightSum === 0) {
      return this.calculateAverage();
    }

    return weightedSum / weightSum;
  }

  private calculateAverage(): number {
    if (this.points.length === 0) return 0;
    return this.points.reduce((sum, p) => sum + p.humidity, 0) / this.points.length;
  }

  interpolateGrid(
    minX: number, minY: number,
    maxX: number, maxY: number,
    gridWidth: number, gridHeight: number,
    options?: {
      blockSize?: number;
      onProgress?: (progress: number) => void;
    }
  ): Float32Array {
    const blockSize = options?.blockSize ?? 32;
    const result = new Float32Array(gridWidth * gridHeight);
    const cellWidth = (maxX - minX) / gridWidth;
    const cellHeight = (maxY - minY) / gridHeight;

    const totalBlocks = Math.ceil(gridWidth / blockSize) * Math.ceil(gridHeight / blockSize);
    let processedBlocks = 0;

    for (let blockY = 0; blockY < gridHeight; blockY += blockSize) {
      for (let blockX = 0; blockX < gridWidth; blockX += blockSize) {
        const blockEndX = Math.min(blockX + blockSize, gridWidth);
        const blockEndY = Math.min(blockY + blockSize, gridHeight);

        const blockMinX = minX + blockX * cellWidth;
        const blockMaxX = minX + blockEndX * cellWidth;
        const blockMinY = maxY - blockEndY * cellHeight;
        const blockMaxY = maxY - blockY * cellHeight;

        const blockCenterX = (blockMinX + blockMaxX) / 2;
        const blockCenterY = (blockMinY + blockMaxY) / 2;
        const blockRadius = Math.max(blockMaxX - blockMinX, blockMaxY - blockMinY) / 2;

        const k = Math.min(this.config.neighborCount ?? 12, this.points.length);
        const nearestToBlock = this.kdTree.nearestK(blockCenterX, blockCenterY, k);
        
        const localPoints = nearestToBlock.map(n => n.point);
        const localTree = new KDTree(localPoints);
        
        const localCalculator = new IDWCalculator(localPoints, {
          ...this.config,
          neighborCount: Math.min(k, 8)
        });
        localCalculator.setCaching(false);

        for (let j = blockY; j < blockEndY; j++) {
          for (let i = blockX; i < blockEndX; i++) {
            const x = minX + (i + 0.5) * cellWidth;
            const y = maxY - (j + 0.5) * cellHeight;
            
            const nearest = localTree.nearest(x, y);
            let localDist = Infinity;
            if (nearest) {
              localDist = this.calculateDistance(x, y, nearest.point.longitude, nearest.point.latitude);
            }

            const distToBlockCenter = this.calculateDistance(x, y, blockCenterX, blockCenterY);
            
            if (localDist < blockRadius * 0.3 || distToBlockCenter < blockRadius * 0.3) {
              result[j * gridWidth + i] = localCalculator.interpolate(x, y);
            } else {
              result[j * gridWidth + i] = this.interpolateInternal(x, y);
            }
          }
        }

        processedBlocks++;
        if (options?.onProgress) {
          options.onProgress(processedBlocks / totalBlocks);
        }
      }
    }

    return result;
  }

  interpolateGridFast(
    minX: number, minY: number,
    maxX: number, maxY: number,
    gridWidth: number, gridHeight: number,
    sampleRate: number = 2
  ): Float32Array {
    const coarseWidth = Math.ceil(gridWidth / sampleRate);
    const coarseHeight = Math.ceil(gridHeight / sampleRate);
    
    const cellWidth = (maxX - minX) / gridWidth;
    const cellHeight = (maxY - minY) / gridHeight;

    const coarseData = new Float32Array(coarseWidth * coarseHeight);
    
    for (let j = 0; j < coarseHeight; j++) {
      for (let i = 0; i < coarseWidth; i++) {
        const x = minX + (i * sampleRate + 0.5) * cellWidth;
        const y = maxY - (j * sampleRate + 0.5) * cellHeight;
        coarseData[j * coarseWidth + i] = this.interpolate(x, y);
      }
    }

    const result = new Float32Array(gridWidth * gridHeight);

    for (let j = 0; j < gridHeight; j++) {
      for (let i = 0; i < gridWidth; i++) {
        const coarseI = Math.floor(i / sampleRate);
        const coarseJ = Math.floor(j / sampleRate);
        
        const i0 = Math.max(0, Math.min(coarseWidth - 1, coarseI));
        const i1 = Math.max(0, Math.min(coarseWidth - 1, coarseI + 1));
        const j0 = Math.max(0, Math.min(coarseHeight - 1, coarseJ));
        const j1 = Math.max(0, Math.min(coarseHeight - 1, coarseJ + 1));

        const fx = (i - coarseI * sampleRate) / sampleRate;
        const fy = (j - coarseJ * sampleRate) / sampleRate;

        const v00 = coarseData[j0 * coarseWidth + i0];
        const v10 = coarseData[j0 * coarseWidth + i1];
        const v01 = coarseData[j1 * coarseWidth + i0];
        const v11 = coarseData[j1 * coarseWidth + i1];

        const v0 = v00 * (1 - fx) + v10 * fx;
        const v1 = v01 * (1 - fx) + v11 * fx;
        result[j * gridWidth + i] = v0 * (1 - fy) + v1 * fy;
      }
    }

    return result;
  }

  setCaching(enabled: boolean): void {
    this.enableCaching = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  clearCache(): void {
    this.cache = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  updatePoints(points: SensorPoint[]): void {
    this.points = [...points];
    this.kdTree = new KDTree(this.points);
    this.clearCache();
  }

  getPoints(): SensorPoint[] {
    return [...this.points];
  }

  getConfig(): IDWConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<IDWConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }

  static benchmark(
    points: SensorPoint[],
    gridSize: number = 200,
    iterations: number = 3
  ): {
    withKDTree: number[];
    withoutKDTree: number[];
    speedup: number;
  } {
    const optimized = new IDWCalculator(points, { neighborCount: 12 });
    const naive = new IDWCalculator(points, { neighborCount: undefined });
    naive.setCaching(false);

    const withKDTree: number[] = [];
    const withoutKDTree: number[] = [];

    const minX = Math.min(...points.map(p => p.longitude));
    const maxX = Math.max(...points.map(p => p.longitude));
    const minY = Math.min(...points.map(p => p.latitude));
    const maxY = Math.max(...points.map(p => p.latitude));

    for (let i = 0; i < iterations; i++) {
      optimized.clearCache();
      const start1 = performance.now();
      optimized.interpolateGrid(minX, minY, maxX, maxY, gridSize, gridSize);
      withKDTree.push(performance.now() - start1);

      const start2 = performance.now();
      naive.interpolateGrid(minX, minY, maxX, maxY, gridSize, gridSize);
      withoutKDTree.push(performance.now() - start2);
    }

    const avgWith = withKDTree.reduce((a, b) => a + b, 0) / withKDTree.length;
    const avgWithout = withoutKDTree.reduce((a, b) => a + b, 0) / withoutKDTree.length;

    return {
      withKDTree,
      withoutKDTree,
      speedup: avgWithout / avgWith
    };
  }
}
