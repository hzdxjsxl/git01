export function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function perpendicularDistance(point, start, end) {
  const A = point.longitude - start.longitude;
  const B = point.latitude - start.latitude;
  const C = end.longitude - start.longitude;
  const D = end.latitude - start.latitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    return Math.sqrt(A * A + B * B);
  }

  const t = Math.max(0, Math.min(1, dot / lenSq));

  const projLng = start.longitude + t * C;
  const projLat = start.latitude + t * D;

  const dx = point.longitude - projLng;
  const dy = point.latitude - projLat;

  return Math.sqrt(dx * dx + dy * dy);
}

export function perpendicularDistanceGeographic(point, start, end) {
  const A = point.longitude - start.longitude;
  const B = point.latitude - start.latitude;
  const C = end.longitude - start.longitude;
  const D = end.latitude - start.latitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    return haversineDistance(
      point.latitude, point.longitude,
      start.latitude, start.longitude
    );
  }

  const t = Math.max(0, Math.min(1, dot / lenSq));

  const projLng = start.longitude + t * C;
  const projLat = start.latitude + t * D;

  return haversineDistance(
    point.latitude, point.longitude,
    projLat, projLng
  );
}

export function douglasPeucker(points, tolerance, useGeographic = true) {
  if (!points || points.length <= 2) {
    return points;
  }

  const result = [];

  const stack = [
    { start: 0, end: points.length - 1 }
  ];

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const distanceFn = useGeographic ? perpendicularDistanceGeographic : perpendicularDistance;

  while (stack.length > 0) {
    const { start, end } = stack.pop();

    let maxDistance = 0;
    let maxIndex = 0;

    for (let i = start + 1; i < end; i++) {
      const distance = distanceFn(
        points[i],
        points[start],
        points[end]
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      keep[maxIndex] = true;
      stack.push({ start, end: maxIndex });
      stack.push({ start: maxIndex, end });
    }
  }

  for (let i = 0; i < points.length; i++) {
    if (keep[i]) {
      result.push(points[i]);
    }
  }

  return result;
}

export function douglasPeuckerRecursive(points, tolerance, useGeographic = true) {
  if (!points || points.length <= 2) {
    return points;
  }

  const distanceFn = useGeographic ? perpendicularDistanceGeographic : perpendicularDistance;

  let maxDistance = 0;
  let maxIndex = 0;
  const last = points.length - 1;

  for (let i = 1; i < last; i++) {
    const distance = distanceFn(
      points[i],
      points[0],
      points[last]
    );

    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeuckerRecursive(
      points.slice(0, maxIndex + 1),
      tolerance,
      useGeographic
    );
    const right = douglasPeuckerRecursive(
      points.slice(maxIndex),
      tolerance,
      useGeographic
    );
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[last]];
}

export function estimateTolerance(targetPointCount, totalPoints, baseTolerance = 10) {
  if (totalPoints <= targetPointCount || targetPointCount <= 2) {
    return 0;
  }

  const ratio = totalPoints / targetPointCount;
  return baseTolerance * Math.pow(ratio, 0.7);
}

export function adaptiveSimplify(points, targetRatio = 0.1, minPoints = 100, useGeographic = true) {
  if (!points || points.length <= Math.max(minPoints, 2)) {
    return points;
  }

  const targetCount = Math.max(
    minPoints,
    Math.floor(points.length * targetRatio),
    2
  );

  let low = 0.1;
  let high = 10000;
  let bestResult = points;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const simplified = douglasPeucker(points, mid, useGeographic);

    if (Math.abs(simplified.length - targetCount) < Math.abs(bestResult.length - targetCount)) {
      bestResult = simplified;
    }

    if (simplified.length > targetCount) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return bestResult;
}

export default douglasPeucker;
