class Point {
  constructor(lng, lat, days) {
    this.lng = lng;
    this.lat = lat;
    this.days = days;
    this.x = lng;
    this.y = lat;
  }
}

class Rectangle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = x - w / 2;
    this.right = x + w / 2;
    this.top = y + h / 2;
    this.bottom = y - h / 2;
  }

  contains(point) {
    return (
      point.x >= this.left &&
      point.x <= this.right &&
      point.y >= this.bottom &&
      point.y <= this.top
    );
  }

  intersects(range) {
    return !(
      range.left > this.right ||
      range.right < this.left ||
      range.top < this.bottom ||
      range.bottom > this.top
    );
  }
}

class QuadTree {
  constructor(boundary, capacity, level = 0) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
    this.level = level;
    this.northwest = null;
    this.northeast = null;
    this.southwest = null;
    this.southeast = null;
    this._centroid = null;
    this._count = 0;
  }

  insert(point) {
    if (!this.boundary.contains(point)) {
      return false;
    }

    this._count++;
    this._centroid = null;

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    if (this.northwest.insert(point)) return true;
    if (this.northeast.insert(point)) return true;
    if (this.southwest.insert(point)) return true;
    if (this.southeast.insert(point)) return true;

    return false;
  }

  subdivide() {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w / 2;
    const h = this.boundary.h / 2;

    const nw = new Rectangle(x - w / 2, y + h / 2, w, h);
    const ne = new Rectangle(x + w / 2, y + h / 2, w, h);
    const sw = new Rectangle(x - w / 2, y - h / 2, w, h);
    const se = new Rectangle(x + w / 2, y - h / 2, w, h);

    this.northwest = new QuadTree(nw, this.capacity, this.level + 1);
    this.northeast = new QuadTree(ne, this.capacity, this.level + 1);
    this.southwest = new QuadTree(sw, this.capacity, this.level + 1);
    this.southeast = new QuadTree(se, this.capacity, this.level + 1);

    this.divided = true;

    const pointsToRedistribute = this.points.slice();
    this.points = [];
    for (const p of pointsToRedistribute) {
      if (this.northwest.insert(p)) continue;
      if (this.northeast.insert(p)) continue;
      if (this.southwest.insert(p)) continue;
      if (this.southeast.insert(p)) continue;
    }
  }

  query(range, found = []) {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      if (range.contains(p)) {
        found.push(p);
      }
    }

    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }

  getCount() {
    if (this._count > 0) return this._count;
    let count = this.points.length;
    if (this.divided) {
      count += this.northwest.getCount();
      count += this.northeast.getCount();
      count += this.southwest.getCount();
      count += this.southeast.getCount();
    }
    this._count = count;
    return count;
  }

  getCentroid() {
    if (this._centroid) return this._centroid;

    let sumLng = 0;
    let sumLat = 0;
    let sumDays = 0;
    let count = 0;

    for (const p of this.points) {
      sumLng += p.lng;
      sumLat += p.lat;
      sumDays += p.days;
      count++;
    }

    if (this.divided) {
      const children = [this.northwest, this.northeast, this.southwest, this.southeast];
      for (const child of children) {
        const childCount = child.getCount();
        if (childCount > 0) {
          const childCentroid = child.getCentroid();
          sumLng += childCentroid.lng * childCount;
          sumLat += childCentroid.lat * childCount;
          sumDays += childCentroid.avgDays * childCount;
          count += childCount;
        }
      }
    }

    if (count === 0) {
      this._centroid = { lng: this.boundary.x, lat: this.boundary.y, avgDays: 0, count: 0 };
    } else {
      this._centroid = {
        lng: sumLng / count,
        lat: sumLat / count,
        avgDays: sumDays / count,
        count: count
      };
    }

    return this._centroid;
  }

  getClusters(targetLevel) {
    const clusters = [];

    if (this.level >= targetLevel) {
      const count = this.getCount();
      if (count > 0) {
        const centroid = this.getCentroid();
        clusters.push(centroid);
      }
      return clusters;
    }

    if (this.divided) {
      clusters.push(...this.northwest.getClusters(targetLevel));
      clusters.push(...this.northeast.getClusters(targetLevel));
      clusters.push(...this.southwest.getClusters(targetLevel));
      clusters.push(...this.southeast.getClusters(targetLevel));
    } else {
      const count = this.getCount();
      if (count > 0) {
        const centroid = this.getCentroid();
        clusters.push(centroid);
      }
    }

    return clusters;
  }

  getAllLeaves(clusters = []) {
    if (this.points.length > 0) {
      for (const p of this.points) {
        clusters.push({
          lng: p.lng,
          lat: p.lat,
          avgDays: p.days,
          count: 1
        });
      }
    }

    if (this.divided) {
      this.northwest.getAllLeaves(clusters);
      this.northeast.getAllLeaves(clusters);
      this.southwest.getAllLeaves(clusters);
      this.southeast.getAllLeaves(clusters);
    }

    return clusters;
  }
}

function zoomToClusterLevel(zoom) {
  const minLevel = 0;
  const maxLevel = 12;
  const normalizedZoom = Math.max(0, Math.min(22, zoom));
  const level = Math.round((normalizedZoom / 22) * maxLevel);
  return Math.max(minLevel, Math.min(maxLevel, level));
}

function getClusterSize(count) {
  if (count <= 1) return 8;
  if (count <= 5) return 12;
  if (count <= 20) return 18;
  if (count <= 100) return 26;
  if (count <= 500) return 36;
  if (count <= 2000) return 48;
  return Math.min(64, 48 + Math.log(count) * 4);
}

function getColorByCount(count) {
  if (count <= 1) return '#fef3c7';
  if (count <= 5) return '#fde047';
  if (count <= 20) return '#fb923c';
  if (count <= 100) return '#f97316';
  if (count <= 500) return '#ef4444';
  if (count <= 2000) return '#dc2626';
  return '#7f1d1d';
}

function getColorByDays(days) {
  const normalized = Math.min(1, days / 180);
  if (normalized < 0.1) return '#fef3c7';
  if (normalized < 0.25) return '#fde047';
  if (normalized < 0.4) return '#fbbf24';
  if (normalized < 0.55) return '#fb923c';
  if (normalized < 0.7) return '#f97316';
  if (normalized < 0.85) return '#ef4444';
  return '#dc2626';
}

export { Point, Rectangle, QuadTree, zoomToClusterLevel, getClusterSize, getColorByCount, getColorByDays };
