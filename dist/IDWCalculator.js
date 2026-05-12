export class IDWCalculator {
    constructor(points, config) {
        this.points = [...points];
        this.config = {
            power: config?.power ?? 2,
            maxDistance: config?.maxDistance,
            neighborCount: config?.neighborCount
        };
    }
    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    interpolate(x, y) {
        if (this.points.length === 0) {
            return 0;
        }
        let weightedSum = 0;
        let weightSum = 0;
        const { power, maxDistance, neighborCount } = this.config;
        let relevantPoints = this.points;
        if (neighborCount !== undefined && neighborCount > 0) {
            const distances = [];
            for (const point of this.points) {
                const distance = this.calculateDistance(x, y, point.longitude, point.latitude);
                distances.push({ point, distance });
            }
            distances.sort((a, b) => a.distance - b.distance);
            relevantPoints = distances.slice(0, neighborCount).map(d => d.point);
        }
        for (const point of relevantPoints) {
            const distance = this.calculateDistance(x, y, point.longitude, point.latitude);
            if (distance === 0) {
                return point.humidity;
            }
            if (maxDistance !== undefined && distance > maxDistance) {
                continue;
            }
            const weight = 1 / Math.pow(distance, power);
            weightedSum += weight * point.humidity;
            weightSum += weight;
        }
        if (weightSum === 0) {
            return this.calculateAverage();
        }
        return weightedSum / weightSum;
    }
    calculateAverage() {
        if (this.points.length === 0)
            return 0;
        return this.points.reduce((sum, p) => sum + p.humidity, 0) / this.points.length;
    }
    interpolateGrid(minX, minY, maxX, maxY, gridWidth, gridHeight) {
        const cellWidth = (maxX - minX) / gridWidth;
        const cellHeight = (maxY - minY) / gridHeight;
        const result = new Float32Array(gridWidth * gridHeight);
        for (let j = 0; j < gridHeight; j++) {
            for (let i = 0; i < gridWidth; i++) {
                const x = minX + (i + 0.5) * cellWidth;
                const y = maxY - (j + 0.5) * cellHeight;
                result[j * gridWidth + i] = this.interpolate(x, y);
            }
        }
        return result;
    }
    updatePoints(points) {
        this.points = [...points];
    }
    getPoints() {
        return [...this.points];
    }
    getConfig() {
        return { ...this.config };
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
