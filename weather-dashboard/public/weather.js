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
        this.gridWidth = 150;
        this.gridHeight = 120;
        this.contourLevels = [10, 25, 50, 100, 150];
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.loadData();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        if (this.grid.length > 0) {
            this.draw();
        }
    }

    async loadData() {
        this.loading.style.display = 'block';
        try {
            const response = await fetch('http://localhost:3001/api/rainfall');
            this.stations = await response.json();
            this.interpolateGrid();
            this.updateStats();
            this.draw();
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            this.loading.style.display = 'none';
        }
    }

    interpolateGrid() {
        this.grid = [];
        
        for (let y = 0; y < this.gridHeight; y++) {
            const row = [];
            for (let x = 0; x < this.gridWidth; x++) {
                const lng = this.minLng + (x / (this.gridWidth - 1)) * (this.maxLng - this.minLng);
                const lat = this.maxLat - (y / (this.gridHeight - 1)) * (this.maxLat - this.minLat);
                const value = this.bilinearInterpolation(lng, lat);
                row.push(value);
            }
            this.grid.push(row);
        }
    }

    bilinearInterpolation(lng, lat) {
        const neighbors = this.findNearestNeighbors(lng, lat, 4);
        
        if (neighbors.length < 2) {
            return 0;
        }
        
        let value = 0;
        let totalWeight = 0;
        
        for (const station of neighbors) {
            const dx = station.lng - lng;
            const dy = station.lat - lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.001) {
                return station.rainfall;
            }
            
            const weight = 1 / (dist * dist + 0.01);
            value += station.rainfall * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? value / totalWeight : 0;
    }

    findNearestNeighbors(lng, lat, count) {
        const distances = this.stations.map(station => {
            const dx = station.lng - lng;
            const dy = station.lat - lat;
            return {
                station,
                distance: Math.sqrt(dx * dx + dy * dy)
            };
        });
        
        return distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count)
            .map(d => d.station);
    }

    marchingSquares(level) {
        const contours = [];
        const visited = new Set();

        for (let y = 0; y < this.gridHeight - 1; y++) {
            for (let x = 0; x < this.gridWidth - 1; x++) {
                const cell = this.getCell(x, y);
                const squareType = this.getSquareType(cell, level);
                
                if (squareType === 0 || squareType === 15) {
                    continue;
                }

                const edges = this.getEdges(squareType);
                for (const edge of edges) {
                    const key = `${x},${y},${edge}`;
                    if (visited.has(key)) continue;

                    const contour = this.traceContour(x, y, edge, level);
                    if (contour.length > 1) {
                        contours.push(contour);
                    }
                    
                    for (const point of contour) {
                        visited.add(`${point.x},${point.y},${point.edge}`);
                    }
                }
            }
        }

        return contours;
    }

    getCell(x, y) {
        return [
            this.grid[y][x],
            this.grid[y][x + 1],
            this.grid[y + 1][x + 1],
            this.grid[y + 1][x]
        ];
    }

    getSquareType(cell, level) {
        let type = 0;
        if (cell[0] >= level) type |= 1;
        if (cell[1] >= level) type |= 2;
        if (cell[2] >= level) type |= 4;
        if (cell[3] >= level) type |= 8;
        return type;
    }

    getEdges(squareType) {
        const edgeMap = {
            1: [0, 3], 2: [0, 1], 3: [1, 3],
            4: [2, 3], 5: [0, 2], 6: [0, 1, 2, 3],
            7: [1, 2], 8: [1, 2], 9: [0, 1, 2, 3],
            10: [0, 2], 11: [2, 3], 12: [0, 3],
            13: [0, 1], 14: [1, 3], 15: []
        };
        return edgeMap[squareType] || [];
    }

    traceContour(startX, startY, startEdge, level) {
        const contour = [];
        let x = startX;
        let y = startY;
        let edge = startEdge;

        while (true) {
            const point = this.getEdgePoint(x, y, edge, level);
            contour.push({ x: point.x, y: point.y, edge });

            const cell = this.getCell(x, y);
            const squareType = this.getSquareType(cell, level);
            const edges = this.getEdges(squareType);
            
            const nextEdge = edges.find(e => e !== edge);
            if (nextEdge === undefined) break;

            switch (nextEdge) {
                case 0:
                    y--;
                    edge = 2;
                    break;
                case 1:
                    x++;
                    edge = 3;
                    break;
                case 2:
                    y++;
                    edge = 0;
                    break;
                case 3:
                    x--;
                    edge = 1;
                    break;
            }

            if (x < 0 || x >= this.gridWidth - 1 || y < 0 || y >= this.gridHeight - 1) {
                break;
            }

            if (x === startX && y === startY && nextEdge === startEdge) {
                break;
            }

            edge = nextEdge;
        }

        return contour;
    }

    getEdgePoint(x, y, edge, level) {
        const cell = this.getCell(x, y);
        
        switch (edge) {
            case 0: {
                const t = (level - cell[3]) / (cell[0] - cell[3] || 0.0001);
                return { x: x + (1 - t) * 0, y: y + (1 - t) * 0 };
            }
            case 1: {
                const t = (level - cell[0]) / (cell[1] - cell[0] || 0.0001);
                return { x: x + t, y: y };
            }
            case 2: {
                const t = (level - cell[2]) / (cell[3] - cell[2] || 0.0001);
                return { x: x + t, y: y + 1 };
            }
            case 3: {
                const t = (level - cell[3]) / (cell[2] - cell[3] || 0.0001);
                return { x: x, y: y + t };
            }
            default:
                return { x, y };
        }
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
        const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let py = 0; py < this.canvas.height; py++) {
            for (let px = 0; px < this.canvas.width; px++) {
                const gx = Math.floor((px / this.canvas.width) * (this.gridWidth - 1));
                const gy = Math.floor((py / this.canvas.height) * (this.gridHeight - 1));
                
                const value = this.grid[gy]?.[gx] || 0;
                const color = this.hexToRgb(this.getColor(value));
                
                const idx = (py * this.canvas.width + px) * 4;
                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = 200;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    drawContours() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.5;

        for (const level of this.contourLevels) {
            const contours = this.marchingSquares(level);
            
            for (const contour of contours) {
                if (contour.length < 2) continue;
                
                this.ctx.beginPath();
                
                for (let i = 0; i < contour.length; i++) {
                    const point = contour[i];
                    const px = (point.x / (this.gridWidth - 1)) * this.canvas.width;
                    const py = (point.y / (this.gridHeight - 1)) * this.canvas.height;
                    
                    if (i === 0) {
                        this.ctx.moveTo(px, py);
                    } else {
                        this.ctx.lineTo(px, py);
                    }
                }
                
                this.ctx.stroke();
                
                if (contour.length > 3) {
                    const first = contour[0];
                    const last = contour[contour.length - 1];
                    const dist = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
                    if (dist < 1) {
                        this.ctx.closePath();
                        this.ctx.stroke();
                    }
                }
            }
        }
    }

    drawStationMarkers() {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        
        for (const station of this.stations) {
            const px = ((station.lng - this.minLng) / (this.maxLng - this.minLng)) * this.canvas.width;
            const py = ((this.maxLat - station.lat) / (this.maxLat - this.minLat)) * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = '10px Microsoft YaHei';
            this.ctx.fillText(station.rainfall.toFixed(1), px + 6, py + 3);
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
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

    draw() {
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