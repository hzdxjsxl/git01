export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(v) {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }

  clone() {
    return new Vector3(this.x, this.y, this.z)
  }

  add(v) {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  sub(v) {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    return this
  }

  multiplyScalar(s) {
    this.x *= s
    this.y *= s
    this.z *= s
    return this
  }

  divideScalar(s) {
    if (s === 0) return this
    this.x /= s
    this.y /= s
    this.z /= s
    return this
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  normalize() {
    const len = this.length()
    if (len === 0) return this
    this.divideScalar(len)
    return this
  }

  distanceTo(v) {
    const dx = this.x - v.x
    const dy = this.y - v.y
    const dz = this.z - v.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  distanceToSquared(v) {
    const dx = this.x - v.x
    const dy = this.y - v.y
    const dz = this.z - v.z
    return dx * dx + dy * dy + dz * dz
  }

  lerp(v, t) {
    this.x += (v.x - this.x) * t
    this.y += (v.y - this.y) * t
    this.z += (v.z - this.z) * t
    return this
  }
}
