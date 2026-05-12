export class PhysicsSolver {
  constructor(config = {}) {
    this.config = {
      rotationSpeed: 0.5,
      galaxyRadius: 50,
      springStrength: 0.05,
      damping: 0.95,
      interactionRadius: 15,
      repulsionStrength: 50,
      mouseInfluence: 1.0
    }
    Object.assign(this.config, config)
  }

  update(dt, particleData, mouseWorldPos, mouseActive) {
    const positions = particleData.positions
    const velocities = particleData.velocities
    const originalPositions = particleData.originalPositions
    const baseAngles = particleData.baseAngles
    const radii = particleData.radii

    const rotationSpeed = this.config.rotationSpeed * dt
    const springStrength = this.config.springStrength
    const damping = this.config.damping
    const interactionRadiusSq = this.config.interactionRadius * this.config.interactionRadius
    const repulsionStrength = this.config.repulsionStrength
    const mouseInfluence = mouseActive ? this.config.mouseInfluence : 0

    const mx = mouseWorldPos.x
    const my = mouseWorldPos.y
    const mz = mouseWorldPos.z

    const count = particleData.count

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      const px = positions[i3]
      const py = positions[i3 + 1]
      const pz = positions[i3 + 2]

      let vx = velocities[i3]
      let vy = velocities[i3 + 1]
      let vz = velocities[i3 + 2]

      const radius = radii[i]
      const baseAngle = baseAngles[i]

      const orbitalSpeed = rotationSpeed / Math.max(radius, 0.5)
      const newAngle = baseAngle + (i * 0.0001) + (Date.now() * 0.0001 * orbitalSpeed)

      const cos = Math.cos(newAngle)
      const sin = Math.sin(newAngle)
      const targetX = radius * cos
      const targetZ = radius * sin
      const targetY = originalPositions[i3 + 1]

      vx += (targetX - px) * springStrength
      vy += (targetY - py) * springStrength
      vz += (targetZ - pz) * springStrength

      if (mouseInfluence > 0) {
        const dx = px - mx
        const dy = py - my
        const dz = pz - mz
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < interactionRadiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const force = repulsionStrength / (distSq + 0.5) * Math.exp(-dist * 0.3)
          const nx = dx / dist
          const ny = dy / dist
          const nz = dz / dist

          vx += nx * force * mouseInfluence * dt
          vy += ny * force * mouseInfluence * dt
          vz += nz * force * mouseInfluence * dt
        }
      }

      vx *= damping
      vy *= damping
      vz *= damping

      velocities[i3] = vx
      velocities[i3 + 1] = vy
      velocities[i3 + 2] = vz

      positions[i3] = px + vx * dt
      positions[i3 + 1] = py + vy * dt
      positions[i3 + 2] = pz + vz * dt
    }
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig)
  }
}
