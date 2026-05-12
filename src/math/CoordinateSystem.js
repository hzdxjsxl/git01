export const CoordinateSystem = {
  sphericalToCartesian(radius, theta, phi) {
    const sinPhi = Math.sin(phi)
    return {
      x: radius * sinPhi * Math.cos(theta),
      y: radius * sinPhi * Math.sin(theta),
      z: radius * Math.cos(phi)
    }
  },

  cylindricalToCartesian(radius, theta, height) {
    return {
      x: radius * Math.cos(theta),
      y: height,
      z: radius * Math.sin(theta)
    }
  },

  cartesianToSpherical(x, y, z) {
    const radius = Math.sqrt(x * x + y * y + z * z)
    if (radius === 0) return { radius: 0, theta: 0, phi: 0 }
    const phi = Math.acos(z / radius)
    let theta = Math.atan2(y, x)
    if (theta < 0) theta += Math.PI * 2
    return { radius, theta, phi }
  },

  cartesianToCylindrical(x, y, z) {
    const radius = Math.sqrt(x * x + z * z)
    let theta = Math.atan2(z, x)
    if (theta < 0) theta += Math.PI * 2
    return { radius, theta, height: y }
  },

  galaxySpiral(radius, armIndex, armCount, tightness = 0.5) {
    const armAngle = (Math.PI * 2 / armCount) * armIndex
    const spiralAngle = armAngle + radius * tightness
    return spiralAngle
  },

  galaxyDensity(radius, coreRadius, armSpread = 1) {
    const coreFalloff = Math.exp(-radius / coreRadius)
    const diskFalloff = Math.exp(-radius * radius / (2 * (coreRadius * 3) * (coreRadius * 3)))
    return coreFalloff * 0.6 + diskFalloff * 0.4
  },

  screenToWorld(mouseX, mouseY, width, height, cameraDistance) {
    return {
      x: (mouseX / width - 0.5) * 2 * cameraDistance,
      y: -(mouseY / height - 0.5) * 2 * cameraDistance,
      z: 0
    }
  }
}
