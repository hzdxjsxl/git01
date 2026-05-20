function clipPolygonHalfPlane(poly, A, B, C) {
    const EPS = 1e-9;
    const out = [];
    const n = poly.length;
    if (n === 0) return out;
    let prev = poly[n - 1];
    let prevSide = A * prev.x + B * prev.y + C;
    for (let i = 0; i < n; i++) {
        const curr = poly[i];
        const currSide = A * curr.x + B * curr.y + C;
        if (currSide >= -EPS) {
            if (prevSide < -EPS) {
                const dx = curr.x - prev.x;
                const dy = curr.y - prev.y;
                const denom = A * dx + B * dy;
                const t = (Math.abs(denom) < EPS) ? 0 : -(A * prev.x + B * prev.y + C) / denom;
                out.push({ x: prev.x + dx * t, y: prev.y + dy * t });
            }
            out.push(curr);
        } else if (prevSide >= -EPS) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const denom = A * dx + B * dy;
            const t = (Math.abs(denom) < EPS) ? 0 : -(A * prev.x + B * prev.y + C) / denom;
            out.push({ x: prev.x + dx * t, y: prev.y + dy * t });
        }
        prev = curr;
        prevSide = currSide;
    }
    return out;
}

function voronoiCells(points, bounds) {
    const n = points.length;
    const cells = new Array(n);
    if (n === 0) return cells;
    for (let i = 0; i < n; i++) {
        const p = points[i];
        let poly = [
            { x: bounds.minX, y: bounds.minY },
            { x: bounds.maxX, y: bounds.minY },
            { x: bounds.maxX, y: bounds.maxY },
            { x: bounds.minX, y: bounds.maxY },
        ];
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const q = points[j];
            const A = p.x - q.x;
            const B = p.y - q.y;
            const C = (q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y) * 0.5;
            poly = clipPolygonHalfPlane(poly, A, B, C);
            if (poly.length < 3) break;
        }
        cells[i] = poly;
    }
    return cells;
}

window.Voronoi = { voronoiCells };
