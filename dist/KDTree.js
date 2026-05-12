export class KDTree {
    constructor(points) {
        this.root = null;
        this.points = [];
        this.dimensions = 2;
        this.points = [...points];
        this.build();
    }
    build() {
        if (this.points.length === 0) {
            this.root = null;
            return;
        }
        const indices = new Array(this.points.length).fill(0).map((_, i) => i);
        this.root = this.buildTree(indices, 0);
    }
    buildTree(indices, depth) {
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
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }
    nearest(x, y) {
        if (!this.root)
            return null;
        let best = {
            point: this.root.point,
            distance: this.distanceSq(x, y, this.root.point.longitude, this.root.point.latitude)
        };
        const search = (node, depth) => {
            if (!node)
                return;
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
    nearestK(x, y, k) {
        if (!this.root || k <= 0)
            return [];
        const results = [];
        const search = (node, depth) => {
            if (!node)
                return;
            const axis = depth % this.dimensions;
            const nodeX = node.point.longitude;
            const nodeY = node.point.latitude;
            const distSq = this.distanceSq(x, y, nodeX, nodeY);
            if (results.length < k) {
                results.push({ point: node.point, distance: distSq });
                if (results.length === k) {
                    this.heapify(results);
                }
            }
            else if (distSq < results[0].distance) {
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
    range(x, y, radius) {
        if (!this.root)
            return [];
        const radiusSq = radius * radius;
        const results = [];
        const search = (node, depth) => {
            if (!node)
                return;
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
    heapify(arr) {
        const n = arr.length;
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            this.siftDown(arr, i);
        }
    }
    siftDown(arr, i) {
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
            if (largest === i)
                break;
            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            i = largest;
        }
    }
    getPoints() {
        return [...this.points];
    }
    size() {
        return this.points.length;
    }
}
