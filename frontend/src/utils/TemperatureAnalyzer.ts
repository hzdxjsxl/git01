export interface RawDataPoint {
  timestamp: number;
  vehicleId: string;
  temperature: number;
}

export interface AnomalySegment {
  vehicleId: string;
  startTime: number;
  endTime: number;
  maxTemperature: number;
  durationMinutes: number;
}

export interface VehicleData {
  vehicleId: string;
  points: Array<{ timestamp: number; temperature: number }>;
  anomalies: AnomalySegment[];
}

const MINUTES_15 = 15 * 60;
const TEMPERATURE_THRESHOLD = 8;

function parseRawData(rawArray: Array<Array<number | string>>): RawDataPoint[] {
  return rawArray.map(item => ({
    timestamp: Number(item[0]),
    vehicleId: String(item[1]),
    temperature: Number(item[2])
  }));
}

function groupByVehicle(data: RawDataPoint[]): Map<string, RawDataPoint[]> {
  const groups = new Map<string, RawDataPoint[]>();
  for (const point of data) {
    if (!groups.has(point.vehicleId)) {
      groups.set(point.vehicleId, []);
    }
    groups.get(point.vehicleId)!.push(point);
  }
  return groups;
}

function sortByTimestamp(points: RawDataPoint[]): RawDataPoint[] {
  return [...points].sort((a, b) => a.timestamp - b.timestamp);
}

function findAnomalySegments(
  sortedPoints: RawDataPoint[],
  threshold: number = TEMPERATURE_THRESHOLD,
  minDurationSeconds: number = MINUTES_15
): AnomalySegment[] {
  const anomalies: AnomalySegment[] = [];
  if (sortedPoints.length === 0) return anomalies;

  let currentSegment: RawDataPoint[] = [];
  const vehicleId = sortedPoints[0].vehicleId;

  const pushAnomaly = (segment: RawDataPoint[]) => {
    if (segment.length < 2) return;
    const startTime = segment[0].timestamp;
    const endTime = segment[segment.length - 1].timestamp;
    const duration = endTime - startTime;

    if (duration >= minDurationSeconds) {
      const maxTemp = Math.max(...segment.map(p => p.temperature));
      anomalies.push({
        vehicleId,
        startTime,
        endTime,
        maxTemperature: maxTemp,
        durationMinutes: Math.round(duration / 60)
      });
    }
  };

  for (const point of sortedPoints) {
    if (point.temperature > threshold) {
      currentSegment.push(point);
    } else {
      pushAnomaly(currentSegment);
      currentSegment = [];
    }
  }

  pushAnomaly(currentSegment);

  return anomalies;
}

export function analyzeTemperatureData(
  rawArray: Array<Array<number | string>>
): VehicleData[] {
  const rawData = parseRawData(rawArray);
  const grouped = groupByVehicle(rawData);
  const result: VehicleData[] = [];

  for (const [vehicleId, points] of grouped.entries()) {
    const sorted = sortByTimestamp(points);
    const anomalies = findAnomalySegments(sorted);
    result.push({
      vehicleId,
      points: sorted.map(p => ({
        timestamp: p.timestamp,
        temperature: p.temperature
      })),
      anomalies
    });
  }

  return result.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
