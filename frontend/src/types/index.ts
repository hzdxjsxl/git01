export interface Building {
  id: string
  name: string
  width: number
  depth: number
  height: number
  x: number
  y: number
  z: number
}

export interface SunPosition {
  altitude: number
  azimuth: number
}

export interface SunTrajectoryInput {
  latitude: number
  longitude: number
  date: Date
}

export interface ShadowAreaResult {
  area: number
  ratio: number
}
