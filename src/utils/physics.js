export const VELOCITY_EPSILON = 0.01
export const FRICTION = 0.95
export const BOUNCE_DAMPING = 0.5
export const SPRING_STIFFNESS = 0.1

export class PhysicsEngine {
  constructor({ friction = FRICTION, bounceDamping = BOUNCE_DAMPING, springStiffness = SPRING_STIFFNESS } = {}) {
    this.friction = friction
    this.bounceDamping = bounceDamping
    this.springStiffness = springStiffness
    this.position = 0
    this.velocity = 0
    this.isRunning = false
    this.bounds = { min: -Infinity, max: Infinity }
  }

  setPosition(pos) {
    this.position = pos
  }

  setVelocity(vel) {
    this.velocity = vel
  }

  setBounds(min, max) {
    this.bounds = { min, max }
  }

  update() {
    this.velocity *= this.friction

    const { min, max } = this.bounds
    let outOfBounds = false

    if (this.position > max) {
      const displacement = this.position - max
      this.velocity -= displacement * this.springStiffness
      this.velocity *= this.bounceDamping
      outOfBounds = true
    } else if (this.position < min) {
      const displacement = this.position - min
      this.velocity -= displacement * this.springStiffness
      this.velocity *= this.bounceDamping
      outOfBounds = true
    }

    this.position += this.velocity

    if (Math.abs(this.velocity) < VELOCITY_EPSILON && !outOfBounds) {
      if (this.position > max + 0.01 || this.position < min - 0.01) {
        this.position = Math.max(min, Math.min(max, this.position))
      }
      return false
    }

    return true
  }

  isAtRest() {
    return Math.abs(this.velocity) < VELOCITY_EPSILON && 
           this.position >= this.bounds.min && 
           this.position <= this.bounds.max
  }
}

export function calculateVelocity(positionHistory, timeHistory) {
  if (positionHistory.length < 2) return 0

  const recentCount = Math.min(5, positionHistory.length)
  let totalVelocity = 0

  for (let i = 1; i < recentCount; i++) {
    const deltaPos = positionHistory[positionHistory.length - i] - positionHistory[positionHistory.length - i - 1]
    const deltaTime = timeHistory[timeHistory.length - i] - timeHistory[timeHistory.length - i - 1]
    
    if (deltaTime > 0) {
      totalVelocity += deltaPos / deltaTime
    }
  }

  return totalVelocity / (recentCount - 1)
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}
