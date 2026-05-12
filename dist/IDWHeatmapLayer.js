import { IDWCalculator } from './IDWCalculator.js'
import { ColorMapper } from './ColorMapper.js'
export class IDWHeatmapLayer {
    constructor(points, options) {
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
        this.gridLayer.createTile = (coords, done) => this.createTile(coords, done);
    }
    createTile(coords, done) {
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
    getInterpolationModeForZoom(zoom) {
        if (this.interpolationMode !== 'adaptive') {
            return this.interpolationMode === 'precise' ? 'precise' : 'fast';
        }
        if (zoom <= 10) {
            return 'fast';
        }
        else if (zoom <= 14) {
            return this.useFastInterpolation ? 'fast' : 'precise';
        }
        else {
            return 'precise';
        }
    }
    renderTile(coords, ctx, size) {
        const map = this.gridLayer._map;
        if (!map)
            return;
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
        let grid;
        if (mode === 'fast' && this.useFastInterpolation && canvasWidth >= 32) {
            const sampleRate = Math.min(4, Math.max(2, Math.floor(canvasWidth / 64)));
            grid = this.idwCalculator.interpolateGridFast(tileMinLng, tileMinLat, tileMaxLng, tileMaxLat, canvasWidth, canvasHeight, sampleRate);
        }
        else {
            grid = this.idwCalculator.interpolateGrid(tileMinLng, tileMinLat, tileMaxLng, tileMaxLat, canvasWidth, canvasHeight, {
                blockSize: 16
            });
        }
        const imageData = this.colorMapper.createColorData(grid, canvasWidth, canvasHeight);
        this.offscreenCanvas.width = canvasWidth;
        this.offscreenCanvas.height = canvasHeight;
        const offCtx = this.offscreenCtx;
        offCtx.putImageData(imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = mode === 'fast' ? 'medium' : 'high';
        ctx.drawImage(this.offscreenCanvas, 0, 0, canvasWidth, canvasHeight, 0, 0, pixelWidth, pixelHeight);
    }
    getTileBounds(coords) {
        const map = this.gridLayer._map;
        if (!map) {
            return L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));
        }
        const tileSize = this.gridLayer.getTileSize();
        const zoom = coords.z;
        const nwPoint = L.point(coords.x * tileSize.x, coords.y * tileSize.y);
        const sePoint = L.point((coords.x + 1) * tileSize.x, (coords.y + 1) * tileSize.y);
        const nw = map.unproject(nwPoint, zoom);
        const se = map.unproject(sePoint, zoom);
        return L.latLngBounds(nw, se);
    }
    addTo(map) {
        this.gridLayer.addTo(map);
        return this;
    }
    remove() {
        this.gridLayer.remove();
        return this;
    }
    updatePoints(points) {
        this.points = [...points];
        this.idwCalculator.updatePoints(this.points);
        this.redraw();
    }
    setIDWConfig(config) {
        this.idwCalculator.setConfig(config);
        this.redraw();
    }
    setResolution(resolution) {
        this.resolution = Math.max(1, Math.min(16, resolution));
        this.redraw();
    }
    setColorMapper(mapper) {
        this.colorMapper = mapper;
        this.redraw();
    }
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.gridLayer.setOpacity(this.opacity);
    }
    setFastInterpolation(enabled) {
        this.useFastInterpolation = enabled;
        this.redraw();
    }
    setInterpolationMode(mode) {
        this.interpolationMode = mode;
        this.redraw();
    }
    redraw() {
        this.idwCalculator.clearCache();
        this.gridLayer.redraw();
    }
    getPerformanceStats() {
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
    resetPerformanceStats() {
        this.performanceStats = {
            tileRenderTimes: [],
            totalPixels: 0,
            totalTiles: 0
        };
        this.idwCalculator.clearCache();
    }
    getIDWConfig() {
        return this.idwCalculator.getConfig();
    }
    getResolution() {
        return this.resolution;
    }
    getPoints() {
        return [...this.points];
    }
    getInterpolationMode() {
        return this.interpolationMode;
    }
}
