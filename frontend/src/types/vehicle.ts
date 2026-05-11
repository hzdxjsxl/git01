export interface VehicleData {
  id: number;
  x: number;
  y: number;
  speed: number;
  heading: number;
}

export interface CollisionPair {
  vehicle1Id: number;
  vehicle2Id: number;
  timeToCollision: number;
  projectedPosition1: { x: number; y: number };
  projectedPosition2: { x: number; y: number };
}
