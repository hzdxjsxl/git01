class Point {
  constructor(lng, lat, days) {
    this.lng = lng;
    this.lat = lat;
    this.days = days;
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
      point.lng >= this.left &&
      point.lng <= this.right &&
      point.lat >= this.bottom &&
      point.lat <= this.top
    );
  }

  containsPoint(lng, lat) {
    return (
      lng >= this.left &&
      lng <= this.right &&
      lat >= this.bottom &&
      lat <= this.top
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

const TEMP_ARRAY = [];
const MAX_LEVEL = 12;

class QuadTree {
  constructor(boundary, capacity, level = 0) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.level = level;
    this.points = null;
    this.divided = false;
    this.northwest = null;
    this.northeast = null;
    this.southwest = null;
    this.southeast = null;
    this.count = 0;
    this.sumLng = 0;
    this.sumLat = 0;
    this.sumDays = 0;
    this._clusterCache = new Array(MAX_LEVEL + 1).fill(null);
  }

  insert(point) {
    if (!this.boundary.contains(point)) {
      return false;
    }

    this.count++;
    this.sumLng += point.lng;
    this.sumLat += point.lat;
    this.sumDays += point.days;
    this._invalidateCache();

    if (this.points === null) {
      this.points = [];
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this._subdivide();
    }

    const lng = point.lng;
    const lat = point.lat;
    const x = this.boundary.x;
    const y = this.boundary.y;

    if (lng < x) {
      if (lat >= y) {
        return this.northwest.insert(point);
      } else {
        return this.southwest.insert(point);
      }
    } else {
      if (lat >= y) {
        return this.northeast.insert(point);
      } else {
        return this.southeast.insert(point);
      }
    }
  }

  _subdivide() {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w / 2;
    const h = this.boundary.h / 2;
    const newLevel = this.level + 1;
    const newCapacity = this.capacity;

    this.northwest = new QuadTree(
      new Rectangle(x - w / 2, y + h / 2, w, h),
      newCapacity,
      newLevel
    );
    this.northeast = new QuadTree(
      new Rectangle(x + w / 2, y + h / 2, w, h),
      newCapacity,
      newLevel
    );
    this.southwest = new QuadTree(
      new Rectangle(x - w / 2, y - h / 2, w, h),
      newCapacity,
      newLevel
    );
    this.southeast = new QuadTree(
      new Rectangle(x + w / 2, y - h / 2, w, h),
      newCapacity,
      newLevel
    );

    this.divided = true;

    if (this.points && this.points.length > 0) {
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        const pLng = p.lng;
        const pLat = p.lat;

        if (pLng < x) {
          if (pLat >= y) {
            this.northwest._insertNoCheck(p);
          } else {
            this.southwest._insertNoCheck(p);
          }
        } else {
          if (pLat >= y) {
            this.northeast._insertNoCheck(p);
          } else {
            this.southeast._insertNoCheck(p);
          }
        }
      }
      this.points = null;
    }
  }

  _insertNoCheck(point) {
    this.count++;
    this.sumLng += point.lng;
    this.sumLat += point.lat;
    this.sumDays += point.days;

    if (this.points === null) {
      this.points = [];
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return;
    }

    if (!this.divided) {
      this._subdivide();
    }

    const lng = point.lng;
    const lat = point.lat;
    const x = this.boundary.x;
    const y = this.boundary.y;

    if (lng < x) {
      if (lat >= y) {
        this.northwest._insertNoCheck(point);
      } else {
        this.southwest._insertNoCheck(point);
      }
    } else {
      if (lat >= y) {
        this.northeast._insertNoCheck(point);
      } else {
        this.southeast._insertNoCheck(point);
      }
    }
  }

  _invalidateCache() {
    for (let i = 0; i <= MAX_LEVEL; i++) {
      this._clusterCache[i] = null;
    }
    if (this.divided) {
      this.northwest._invalidateCache();
      this.northeast._invalidateCache();
      this.southwest._invalidateCache();
      this.southeast._invalidateCache();
    }
  }

  getCentroid() {
    if (this.count === 0) {
      return {
        lng: this.boundary.x,
        lat: this.boundary.y,
        avgDays: 0,
        count: 0
      };
    }
    return {
      lng: this.sumLng / this.count,
      lat: this.sumLat / this.count,
      avgDays: this.sumDays / this.count,
      count: this.count
    };
  }

  getClusters(targetLevel, result = null) {
    if (result === null) {
      result = [];
    }

    if (this.level >= targetLevel || !this.divided) {
      if (this.count > 0) {
        result.push({
          lng: this.sumLng / this.count,
          lat: this.sumLat / this.count,
          avgDays: this.sumDays / this.count,
          count: this.count
        });
      }
      return result;
    }

    this.northwest.getClusters(targetLevel, result);
    this.northeast.getClusters(targetLevel, result);
    this.southwest.getClusters(targetLevel, result);
    this.southeast.getClusters(targetLevel, result);

    return result;
  }

  getClustersFast(targetLevel) {
    if (this._clusterCache[targetLevel] !== null) {
      return this._clusterCache[targetLevel];
    }

    const result = [];
    this._collectClusters(targetLevel, result);
    this._clusterCache[targetLevel] = result;
    return result;
  }

  _collectClusters(targetLevel, result) {
    if (this.level >= targetLevel || !this.divided) {
      if (this.count > 0) {
        result.push({
          lng: this.sumLng / this.count,
          lat: this.sumLat / this.count,
          avgDays: this.sumDays / this.count,
          count: this.count
        });
      }
      return;
    }

    this.northwest._collectClusters(targetLevel, result);
    this.northeast._collectClusters(targetLevel, result);
    this.southwest._collectClusters(targetLevel, result);
    this.southeast._collectClusters(targetLevel, result);
  }

  getCount() {
    return this.count;
  }

  query(range, found = null) {
    if (found === null) {
      found = [];
    }

    if (!this.boundary.intersects(range)) {
      return found;
    }

    if (this.points) {
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        if (range.containsPoint(p.lng, p.lat)) {
          found.push(p);
        }
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
}

function buildQuadTreeBulk(points, boundary, capacity = 16) {
  const tree = new QuadTree(boundary, capacity);
  for (let i = 0; i < points.length; i++) {
    tree.insert(points[i]);
  }
  return tree;
}

function buildQuadTreeFast(cases, boundary, capacity = 16) {
  const tree = new QuadTree(boundary, capacity);
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    tree.insert(new Point(c[0], c[1], c[2]));
  }
  return tree;
}

function zoomToClusterLevel(zoom) {
  const minLevel = 1;
  const maxLevel = MAX_LEVEL;
  const normalizedZoom = Math.max(0, Math.min(22, zoom));
  const level = Math.floor((normalizedZoom / 22) * maxLevel) + 1;
  return Math.max(minLevel, Math.min(maxLevel, level));
}

function getClusterSize(count) {
  if (count <= 1) return 6;
  if (count <= 5) return 10;
  if (count <= 20) return 16;
  if (count <= 100) return 24;
  if (count <= 500) return 32;
  if (count <= 2000) return 44;
  return Math.min(60, 44 + Math.log(count) * 3);
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

export {
  Point,
  Rectangle,
  QuadTree,
  buildQuadTreeBulk,
  buildQuadTreeFast,
  zoomToClusterLevel,
  getClusterSize,
  getColorByCount
};
