export const Noise = {
  hash(x, y, z) {
    let h = x * 374761393 + y * 668265263 + z * 2147483647
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h >>> 0) / 4294967295
  },

  hash1(x) {
    let h = x * 374761393
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h >>> 0) / 4294967295
  },

  hash2(x, y) {
    let h = x * 374761393 + y * 668265263
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h >>> 0) / 4294967295
  },

  rand(seed) {
    return this.hash1(seed)
  },

  randRange(min, max, seed) {
    return min + this.hash1(seed) * (max - min)
  },

  randn(seed1, seed2) {
    const u1 = 1 - this.hash1(seed1)
    const u2 = this.hash1(seed2)
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  },

  boxMuller(seed1, seed2) {
    return {
      x: this.randn(seed1, seed2),
      y: this.randn(seed1 + 1000, seed2 + 1000)
    }
  }
}
