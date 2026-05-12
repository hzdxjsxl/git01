import { CoordinateSystem, Noise } from '../math/index.js'

export class ParticleData {
  constructor(count = 100000) {
    this.count = count

    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.colors = new Float32Array(count * 3)
    this.sizes = new Float32Array(count)
    this.originalPositions = new Float32Array(count * 3)
    this.baseAngles = new Float32Array(count)
    this.radii = new Float32Array(count)
    this.armIndices = new Float32Array(count)
    this.densities = new Float32Array(count)
  }

  initialize(config) {
    const {
      armCount = 4,
      coreRadius = 5,
      galaxyRadius = 50,
      diskHeight = 2,
      spiralTightness = 0.15,
      rotationSpeed = 0.5
    } = config

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      const seed = i * 1337

      const density = Noise.rand(seed + 1)
      this.densities[i] = density

      const radiusRaw = Math.pow(Noise.rand(seed + 2), 0.7)
      const radius = radiusRaw * galaxyRadius
      this.radii[i] = radius

      const armIndex = Math.floor(Noise.rand(seed + 3) * armCount)
      this.armIndices[i] = armIndex

      const baseAngle = CoordinateSystem.galaxySpiral(
        radius,
        armIndex,
        armCount,
        spiralTightness
      )

      const armOffset = Noise.randn(seed + 4, seed + 5) * 0.8
      const finalAngle = baseAngle + armOffset
      this.baseAngles[i] = finalAngle

      const heightNoise = Noise.randn(seed + 6, seed + 7)
      const heightFalloff = Math.exp(-radius / (galaxyRadius * 0.3))
      const height = heightNoise * diskHeight * 0.5 * heightFalloff

      const armSpread = 1.5 * (1 - Math.min(radius / galaxyRadius, 1))
      const radiusJitter = Noise.randn(seed + 8, seed + 9) * armSpread
      const finalRadius = Math.max(0, radius + radiusJitter)

      const pos = CoordinateSystem.cylindricalToCartesian(finalRadius, finalAngle, height)

      this.positions[i3] = pos.x
      this.positions[i3 + 1] = pos.y
      this.positions[i3 + 2] = pos.z

      this.originalPositions[i3] = pos.x
      this.originalPositions[i3 + 1] = pos.y
      this.originalPositions[i3 + 2] = pos.z

      this.velocities[i3] = 0
      this.velocities[i3 + 1] = 0
      this.velocities[i3 + 2] = 0

      this.setParticleColor(i, radius, galaxyRadius, coreRadius)

      const sizeBase = 0.05 + Math.exp(-radius / coreRadius) * 0.15
      this.sizes[i] = sizeBase * (0.8 + Noise.rand(seed + 10) * 0.4)
    }
  }

  setParticleColor(index, radius, galaxyRadius, coreRadius) {
    const i3 = index * 3
    const normalizedRadius = radius / galaxyRadius

    let r, g, b

    if (normalizedRadius < 0.15) {
      const t = normalizedRadius / 0.15
      r = 1.0
      g = 0.9 + t * 0.1
      b = 0.7 + t * 0.3
    } else if (normalizedRadius < 0.5) {
      const t = (normalizedRadius - 0.15) / 0.35
      r = 1.0 - t * 0.3
      g = 1.0 - t * 0.2
      b = 0.9 - t * 0.1
    } else {
      const t = Math.min((normalizedRadius - 0.5) / 0.5, 1)
      r = 0.7 - t * 0.2
      g = 0.8 - t * 0.1
      b = 1.0 - t * 0.1
    }

    const seed = index * 7
    const jitter = 0.1
    r += (Noise.rand(seed + 1) - 0.5) * jitter
    g += (Noise.rand(seed + 2) - 0.5) * jitter
    b += (Noise.rand(seed + 3) - 0.5) * jitter

    this.colors[i3] = Math.max(0, Math.min(1, r))
    this.colors[i3 + 1] = Math.max(0, Math.min(1, g))
    this.colors[i3 + 2] = Math.max(0, Math.min(1, b))
  }

  getPosition(index) {
    const i3 = index * 3
    return {
      x: this.positions[i3],
      y: this.positions[i3 + 1],
      z: this.positions[i3 + 2]
    }
  }

  setPosition(index, x, y, z) {
    const i3 = index * 3
    this.positions[i3] = x
    this.positions[i3 + 1] = y
    this.positions[i3 + 2] = z
  }

  getVelocity(index) {
    const i3 = index * 3
    return {
      x: this.velocities[i3],
      y: this.velocities[i3 + 1],
      z: this.velocities[i3 + 2]
    }
  }

  setVelocity(index, x, y, z) {
    const i3 = index * 3
    this.velocities[i3] = x
    this.velocities[i3 + 1] = y
    this.velocities[i3 + 2] = z
  }
}
