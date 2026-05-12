import { IDWCalculator } from './IDWCalculator';
import { ColorMapper } from './ColorMapper';
import { SensorPoint, IDWConfig } from './types';

declare var L: any;

export interface IDWHeatmapOptions {
  idwConfig?: Partial<IDWConfig>;
  colorMapper?: ColorMapper;
  resolution?: number;
  opacity?: number;
  useFastInterpolation?: boolean;
  interpolationMode?: 'adaptive' | 'precise' | 'fast';
}

export class IDWHeatmapLayer {
  private points: SensorPoint[];
  private idwCalculator: IDWCalculator;
  private colorMapper: ColorMapper;
  private resolution: number;
  private opacity: number;
  private useFastInterpolation: boolean;
  private interpolationMode: 'adaptive' | 'precise' | 'fast';
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private gridLayer: any;
  private performanceStats: {
    tileRenderTimes: number[];
    totalPixels: number;
    totalTiles: number;
  };

  constructor(points: SensorPoint[], options?: IDWHeatmapOptions) {
    this.points = [...points];
    this.idwCalculator = new IDWCalculator(this.points, options?.idwConfig);
    this.colorMapper = options?.colorMapper ?? ColorMapper.createDefaultHumidityMapper();
    this.resolution = options?.resolution ?? 4;
    this.opacity = options?.opacity ?? 0.75;
    this.useFastInterpolation = options?.useFastInterpolation ?? true;
    this.interpolationMode = options?.interpolationMode ?? 'adaptive';
    this.performanceStats = {
      tileRenderTimes: [],
      totalPixels: 0,
      totalTiles: 0
    };

    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.offscreenCtx = ctx;

    this.gridLayer = L.gridLayer({ opacity: this.opacity });
    this.gridLayer.createTile = (coords: any, done: any) => this.createTile(coords, done);
  }

  private createTile(coords: any, done: any): HTMLElement {
    const tile = L.DomUtil.create('canvas', 'leaflet-tile');
    const size = this.gridLayer.getTileSize();

    tile.width = size.x;
    tile.height = size.y;

    const ctx = tile.getContext('2d');
    if (!ctx) {
      done(undefined, tile);
      return tile;
    }

    const startTime = performance.now();

    this.renderTile(coords, ctx, size);

    const renderTime = performance.now() - startTime;
    this.performanceStats.tileRenderTimes.push(renderTime);
    if (this.performanceStats.tileRenderTimes.length > 100) {
      this.performanceStats.tileRenderTimes.shift();
    }
    this.performanceStats.totalTiles++;

    done(undefined, tile);

    return tile;
  }

  private getInterpolationModeForZoom(zoom: number): 'precise' | 'fast' {
    if (this.interpolationMode !== 'adaptive') {
      return this.interpolationMode === 'precise' ? 'precise' : 'fast';
    }

    if (zoom <= 10) {
      return 'fast';
    } else if (zoom <= 14) {
      return this.useFastInterpolation ? 'fast' : 'precise';
    } else {
      return 'precise';
    }
  }

  private renderTile(coords: any, ctx: CanvasRenderingContext2D, size: any): void {
    const map = this.gridLayer._map;
    if (!map) return;

    const tileLngLatBounds = this.getTileBounds(coords);

    const tileMinLng = tileLngLatBounds.getWest();
    const tileMinLat = tileLngLatBounds.getSouth();
    const tileMaxLng = tileLngLatBounds.getEast();
    const tileMaxLat = tileLngLatBounds.getNorth();

    const pixelWidth = size.x;
    const pixelHeight = size.y;

    const canvasWidth = Math.ceil(pixelWidth / this.resolution);
    const canvasHeight = Math.ceil(pixelHeight / this.resolution);

    if (canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }

    this.performanceStats.totalPixels += canvasWidth * canvasHeight;

    const zoom = coords.z;
    const mode = this.getInterpolationModeForZoom(zoom);

    let grid: Float32Array;

    if (mode === 'fast' && this.useFastInterpolation && canvasWidth >= 32) {
      const sampleRate = Math.min(4, Math.max(2, Math.floor(canvasWidth / 64)));
      grid = this.idwCalculator.interpolateGridFast(
        tileMinLng,
        tileMinLat,
        tileMaxLng,
        tileMaxLat,
        canvasWidth,
        canvasHeight,
        sampleRate
      );
    } else {
      grid = this.idwCalculator.interpolateGrid(
        tileMinLng,
        tileMinLat,
        tileMaxLng,
        tileMaxLat,
        canvasWidth,
        canvasHeight,
        {
          blockSize: 16
        }
      );
    }

    const imageData = this.colorMapper.createColorData(grid, canvasWidth, canvasHeight);

    this.offscreenCanvas.width = canvasWidth;
    this.offscreenCanvas.height = canvasHeight;
    const offCtx = this.offscreenCtx;
    offCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = mode === 'fast' ? 'medium' : 'high';
    ctx.drawImage(
      this.offscreenCanvas,
      0,
      0,
      canvasWidth,
      canvasHeight,
      0,
      0,
      pixelWidth,
      pixelHeight
    );
  }

  private getTileBounds(coords: any): any {
    const map = this.gridLayer._map;
    if (!map) {
      return L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
      );
    }

    const tileSize = this.gridLayer.getTileSize();
    const zoom = coords.z;

    const nwPoint = L.point(
      coords.x * tileSize.x,
      coords.y * tileSize.y
    );

    const sePoint = L.point(
      (coords.x + 1) * tileSize.x,
      (coords.y + 1) * tileSize.y
    );

    const nw = map.unproject(nwPoint, zoom);
    const se = map.unproject(sePoint, zoom);

    return L.latLngBounds(nw, se);
  }

  addTo(map: any): IDWHeatmapLayer {
    this.gridLayer.addTo(map);
    return this;
  }

  remove(): IDWHeatmapLayer {
    this.gridLayer.remove();
    return this;
  }

  updatePoints(points: SensorPoint[]): void {
    this.points = [...points];
    this.idwCalculator.updatePoints(this.points);
    this.redraw();
  }

  setIDWConfig(config: Partial<IDWConfig>): void {
    this.idwCalculator.setConfig(config);
    this.redraw();
  }

  setResolution(resolution: number): void {
    this.resolution = Math.max(1, Math.min(16, resolution));
    this.redraw();
  }

  setColorMapper(mapper: ColorMapper): void {
    this.colorMapper = mapper;
    this.redraw();
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
    this.gridLayer.setOpacity(this.opacity);
  }

  setFastInterpolation(enabled: boolean): void {
    this.useFastInterpolation = enabled;
    this.redraw();
  }

  setInterpolationMode(mode: 'adaptive' | 'precise' | 'fast'): void {
    this.interpolationMode = mode;
    this.redraw();
  }

  redraw(): void {
    this.idwCalculator.clearCache();
    this.gridLayer.redraw();
  }

  getPerformanceStats(): {
    avgTileRenderTime: number;
    totalTiles: number;
    totalPixels: number;
    cacheStats: ReturnType<IDWCalculator['getCacheStats']>;
  } {
    const times = this.performanceStats.tileRenderTimes;
    const avgTime = times.length > 0 
      ? times.reduce((a, b) => a + b, 0) / times.length 
      : 0;

    return {
      avgTileRenderTime: avgTime,
      totalTiles: this.performanceStats.totalTiles,
      totalPixels: this.performanceStats.totalPixels,
      cacheStats: this.idwCalculator.getCacheStats()
    };
  }

  resetPerformanceStats(): void {
    this.performanceStats = {
      tileRenderTimes: [],
      totalPixels: 0,
      totalTiles: 0
    };
    this.idwCalculator.clearCache();
  }

  getIDWConfig(): IDWConfig {
    return this.idwCalculator.getConfig();
  }

  getResolution(): number {
    return this.resolution;
  }

  getPoints(): SensorPoint[] {
    return [...this.points];
  }

  getInterpolationMode(): 'adaptive' | 'precise' | 'fast' {
    return this.interpolationMode;
  }
}
