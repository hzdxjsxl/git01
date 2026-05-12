export interface SensorPoint {
  sensorId: string;
  longitude: number;
  latitude: number;
  humidity: number;
  timestamp: string;
}

export interface InterpolatedPoint {
  x: number;
  y: number;
  value: number;
}

export interface IDWConfig {
  power: number;
  maxDistance?: number;
  neighborCount?: number;
}

export interface ColorStop {
  value: number;
  r: number;
  g: number;
  b: number;
  a: number;
}
