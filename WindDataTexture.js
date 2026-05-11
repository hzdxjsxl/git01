import * as THREE from 'three';

export class WindDataTexture {
    constructor(renderer) {
        this.renderer = renderer;
        this.texture = null;
        this.width = 0;
        this.height = 0;
        this.minU = Infinity;
        this.maxU = -Infinity;
        this.minV = Infinity;
        this.maxV = -Infinity;
    }

    async loadFromJSON(jsonPath) {
        const response = await fetch(jsonPath);
        const data = await response.json();
        return this.createFromData(data);
    }

    createFromData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid wind data format');
        }

        const firstPoint = data[0];
        if (!('lon' in firstPoint) || !('lat' in firstPoint) || 
            !('u' in firstPoint) || !('v' in firstPoint)) {
            throw new Error('Wind data must contain lon, lat, u, v fields');
        }

        this.analyzeData(data);
        this.determineGridDimensions(data);

        const pixels = new Float32Array(this.width * this.height * 4);
        this.fillTextureData(data, pixels);

        this.texture = new THREE.DataTexture(
            pixels,
            this.width,
            this.height,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        this.texture.needsUpdate = true;

        return this.texture;
    }

    analyzeData(data) {
        for (const point of data) {
            this.minU = Math.min(this.minU, point.u);
            this.maxU = Math.max(this.maxU, point.u);
            this.minV = Math.min(this.minV, point.v);
            this.maxV = Math.max(this.maxV, point.v);
        }
    }

    determineGridDimensions(data) {
        const lons = new Set();
        const lats = new Set();

        for (const point of data) {
            lons.add(point.lon);
            lats.add(point.lat);
        }

        this.width = lons.size;
        this.height = lats.size;

        const sortedLons = Array.from(lons).sort((a, b) => a - b);
        const sortedLats = Array.from(lats).sort((a, b) => a - b);

        this.lonStep = this.width > 1 ? sortedLons[1] - sortedLons[0] : 0;
        this.latStep = this.height > 1 ? sortedLats[1] - sortedLats[0] : 0;
        this.minLon = sortedLons[0];
        this.maxLon = sortedLons[sortedLons.length - 1];
        this.minLat = sortedLats[0];
        this.maxLat = sortedLats[sortedLats.length - 1];
    }

    fillTextureData(data, pixels) {
        const lonToX = new Map();
        const latToY = new Map();

        const lons = Array.from(new Set(data.map(p => p.lon))).sort((a, b) => a - b);
        const lats = Array.from(new Set(data.map(p => p.lat))).sort((a, b) => a - b);

        lons.forEach((lon, i) => lonToX.set(lon, i));
        lats.forEach((lat, i) => latToY.set(lat, this.height - 1 - i));

        for (const point of data) {
            const x = lonToX.get(point.lon);
            const y = latToY.get(point.lat);
            
            if (x !== undefined && y !== undefined) {
                const idx = (y * this.width + x) * 4;
                pixels[idx] = point.u;
                pixels[idx + 1] = point.v;
                pixels[idx + 2] = point.lon;
                pixels[idx + 3] = point.lat;
            }
        }
    }

    getTexture() {
        return this.texture;
    }

    getDimensions() {
        return { width: this.width, height: this.height };
    }

    getBounds() {
        return {
            minLon: this.minLon,
            maxLon: this.maxLon,
            minLat: this.minLat,
            maxLat: this.maxLat,
            minU: this.minU,
            maxU: this.maxU,
            minV: this.minV,
            maxV: this.maxV
        };
    }

    getUVRange() {
        const uRange = Math.max(Math.abs(this.maxU - this.minU), 0.001);
        const vRange = Math.max(Math.abs(this.maxV - this.minV), 0.001);
        const maxRange = Math.max(uRange, vRange);
        return maxRange;
    }

    lonLatToUV(lon, lat) {
        const u = (lon - this.minLon) / (this.maxLon - this.minLon);
        const v = 1 - (lat - this.minLat) / (this.maxLat - this.minLat);
        return new THREE.Vector2(u, v);
    }

    uvToLonLat(u, v) {
        const lon = this.minLon + u * (this.maxLon - this.minLon);
        const lat = this.maxLat - v * (this.maxLat - this.minLat);
        return { lon, lat };
    }

    destroy() {
        if (this.texture) {
            this.texture.dispose();
        }
    }
}
