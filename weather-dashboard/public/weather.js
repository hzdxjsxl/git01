class WeatherDashboard {
    constructor() {
        this.canvas = document.getElementById('weatherCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.loading = document.getElementById('loading');
        this.stations = [];
        this.grid = [];
        this.minLng = 73;
        this.maxLng = 135;
        this.minLat = 18;
        this.maxLat = 53;
        this.gridWidth = 50;
        this.gridHeight = 40;
        this.contourLevels = [10, 25, 50, 100, 150];
        this.stationSpatial = new Map();
        this.spatialCellSize = 5;
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.loadData();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (this.grid.length > 0) {
            this.draw();
        }
    }

    async loadData() {
        this.loading.style.display = 'block';
        try {
            const response = await fetch('http://localhost:3001/api/rainfall');
            this.stations = await response.json();
            this.buildSpatialIndex();
            await this.interpolateGridAsync();
            this.updateStats();
            await this.drawAsync();
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            this.loading.style.display = 'none';
        }
    }

    buildSpatialIndex() {
        this.stationSpatial = new Map();
        
        for (const station of this.stations) {
            const gx = Math.floor((station.lng - this.minLng) / this.spatialCellSize);
            const gy = Math.floor((station.lat - this.minLat) / this.spatialCellSize);
            const key = `${gx},${gy}`;
            
            if (!this.stationSpatial.has(key)) {
                this.stationSpatial.set(key, []);
            }
            this.stationSpatial.get(key).push(station);
        }
    }

    getNearbyStations(lng, lat) {
        const gx = Math.floor((lng - this.minLng) / this.spatialCellSize);
        const gy = Math.floor((lat - this.minLat) / this.spatialCellSize);
        const stations = [];
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${gx + dx},${gy + dy}`;
                const cellStations = this.stationSpatial.get(key);
                if (cellStations) {
                    stations.push(...cellStations);
                }
            }
        }
        
        return stations;
    }

    async interpolateGridAsync() {
        this.grid = [];
        
        for (let y = 0; y < this.gridHeight; y++) {
            const row = [];
            for (let x = 0; x < this.gridWidth; x++) {
                const lng = this.minLng + (x / (this.gridWidth - 1)) * (this.maxLng - this.minLng);
                const lat = this.maxLat - (y / (this.gridHeight - 1)) * (this.maxLat - this.minLat);
                row.push(this.interpolateValue(lng, lat));
            }
            this.grid.push(row);
        }
    }

    interpolateValue(lng, lat) {
        const nearby = this.getNearbyStations(lng, lat);
        
        if (nearby.length === 0) {
            return 0;
        }
        
        let value = 0;
        let totalWeight = 0;
        
        for (const station of nearby) {
            const dx = station.lng - lng;
            const dy = station.lat - lat;
            const dist = dx * dx + dy * dy;
            
            if (dist < 0.0001) {
                return station.rainfall;
            }
            
            if (dist < 36) {
                const weight = 1 / (dist + 0.1);
                value += station.rainfall * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? value / totalWeight : 0;
    }

    yieldToBrowser() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    marchingSquares(level) {
        const lines = [];

        for (let y = 0; y < this.gridHeight - 1; y++) {
            for (let x = 0; x < this.gridWidth - 1; x++) {
                const v0 = this.grid[y][x];
                const v1 = this.grid[y][x + 1];
                const v2 = this.grid[y + 1][x + 1];
                const v3 = this.grid[y + 1][x];
                
                let type = 0;
                if (v0 >= level) type |= 1;
                if (v1 >= level) type |= 2;
                if (v2 >= level) type |= 4;
                if (v3 >= level) type |= 8;
                
                if (type === 0 || type === 15) continue;

                const interpPoints = this.getInterpPoints(x, y, v0, v1, v2, v3, level);
                
                switch (type) {
                    case 1: case 14:
                        lines.push([interpPoints.a, interpPoints.d]);
                        break;
                    case 2: case 13:
                        lines.push([interpPoints.a, interpPoints.b]);
                        break;
                    case 3: case 12:
                        lines.push([interpPoints.b, interpPoints.d]);
                        break;
                    case 4: case 11:
                        lines.push([interpPoints.c, interpPoints.d]);
                        break;
                    case 5: case 10:
                        lines.push([interpPoints.a, interpPoints.c]);
                        break;
                    case 6: case 9:
                        lines.push([interpPoints.a, interpPoints.b]);
                        lines.push([interpPoints.c, interpPoints.d]);
                        break;
                    case 7: case 8:
                        lines.push([interpPoints.b, interpPoints.c]);
                        break;
                }
            }
        }

        return lines;
    }

    getInterpPoints(x, y, v0, v1, v2, v3, level) {
        const interp = (vLow, vHigh) => {
            const diff = vHigh - vLow;
            if (diff === 0) return 0.5;
            return (level - vLow) / diff;
        };

        return {
            a: { x: x + interp(v0, v1), y: y },
            b: { x: x + 1, y: y + interp(v1, v2) },
            c: { x: x + interp(v3, v2), y: y + 1 },
            d: { x: x, y: y + interp(v0, v3) }
        };
    }

    getColor(value) {
        if (value < 10) return '#ffffcc';
        if (value < 25) return '#c7e9b4';
        if (value < 50) return '#7fcdbb';
        if (value < 100) return '#41b6c4';
        if (value < 150) return '#2c7fb8';
        return '#253494';
    }

    drawColorGradient() {
        if (this.grid.length === 0) return;
        
        const offscreen = document.createElement('canvas');
        offscreen.width = this.gridWidth;
        offscreen.height = this.gridHeight;
        const offCtx = offscreen.getContext('2d');
        
        const imageData = offCtx.createImageData(this.gridWidth, this.gridHeight);
        const data = imageData.data;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const value = this.grid[y][x] || 0;
                const color = this.hexToRgb(this.getColor(value));
                
                const idx = (y * this.gridWidth + x) * 4;
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = 200;
            }
        }

        offCtx.putImageData(imageData, 0, 0);
        
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.drawImage(offscreen, 0, 0, this.canvas.width, this.canvas.height);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    async drawContoursAsync() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.5;

        for (const level of this.contourLevels) {
            const lines = this.marchingSquares(level);
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                this.ctx.beginPath();
                const p0 = this.gridToPixel(line[0]);
                const p1 = this.gridToPixel(line[1]);
                this.ctx.moveTo(p0.x, p0.y);
                this.ctx.lineTo(p1.x, p1.y);
                this.ctx.stroke();
            }
        }
    }

    gridToPixel(point) {
        return {
            x: (point.x / (this.gridWidth - 1)) * this.canvas.width,
            y: (point.y / (this.gridHeight - 1)) * this.canvas.height
        };
    }

    drawStationMarkers() {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        
        for (const station of this.stations) {
            const px = ((station.lng - this.minLng) / (this.maxLng - this.minLng)) * this.canvas.width;
            const py = ((this.maxLat - station.lat) / (this.maxLat - this.minLat)) * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawChinaOutline() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        
        const outline = [
            { lng: 73, lat: 53 }, { lng: 135, lat: 53 },
            { lng: 135, lat: 18 }, { lng: 73, lat: 18 },
            { lng: 73, lat: 53 }
        ];
        
        this.ctx.beginPath();
        for (let i = 0; i < outline.length; i++) {
            const px = ((outline[i].lng - this.minLng) / (this.maxLng - this.minLng)) * this.canvas.width;
            const py = ((this.maxLat - outline[i].lat) / (this.maxLat - this.minLat)) * this.canvas.height;
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.stroke();
    }

    async drawAsync() {
        if (this.grid.length === 0) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawColorGradient();
        this.drawContours();
        this.drawChinaOutline();
        this.drawStationMarkers();
    }

    drawContours() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.5;

        for (const level of this.contourLevels) {
            const lines = this.marchingSquares(level);
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                this.ctx.beginPath();
                const p0 = this.gridToPixel(line[0]);
                const p1 = this.gridToPixel(line[1]);
                this.ctx.moveTo(p0.x, p0.y);
                this.ctx.lineTo(p1.x, p1.y);
                this.ctx.stroke();
            }
        }
    }

    draw() {
        if (this.grid.length === 0) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawColorGradient();
        this.drawContours();
        this.drawChinaOutline();
        this.drawStationMarkers();
    }

    updateStats() {
        document.getElementById('stationCount').textContent = this.stations.length;
        
        const values = this.stations.map(s => s.rainfall);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        document.getElementById('avgRain').textContent = avg.toFixed(1) + ' mm';
        document.getElementById('maxRain').textContent = max.toFixed(1) + ' mm';
        document.getElementById('minRain').textContent = min.toFixed(1) + ' mm';
    }
}

function refreshData() {
    window.dashboard.loadData();
}

window.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new WeatherDashboard();
});