import * as THREE from 'three'
import { ParticleData } from './ParticleData.js'
import { PhysicsSolver } from './PhysicsSolver.js'

export class GalaxyParticleSystem {
  constructor(threeScene, config = {}) {
    this.scene = threeScene

    this.config = {
      particleCount: 100000,
      armCount: 4,
      coreRadius: 5,
      galaxyRadius: 50,
      diskHeight: 2,
      spiralTightness: 0.15,
      rotationSpeed: 0.5,
      particleSize: 1.0,
      useAdditiveBlending: true
    }
    Object.assign(this.config, config)

    this.particleData = new ParticleData(this.config.particleCount)
    this.physicsSolver = new PhysicsSolver({
      rotationSpeed: this.config.rotationSpeed,
      galaxyRadius: this.config.galaxyRadius
    })

    this.points = null
    this.threeGeometry = null
    this.threeMaterial = null
    this.needsUpdate = false

    this.time = 0

    this.mouseWorldPos = { x: 0, y: 0, z: 0 }
    this.mouseActive = false
    this.targetMouseWorldPos = { x: 0, y: 0, z: 0 }

    this.init()
  }

  init() {
    this.particleData.initialize(this.config)
    this.createThreeObjects()
  }

  createThreeObjects() {
    this.threeGeometry = new THREE.BufferGeometry()

    const positionAttribute = new THREE.BufferAttribute(this.particleData.positions, 3)
    const colorAttribute = new THREE.BufferAttribute(this.particleData.colors, 3)
    const sizeAttribute = new THREE.BufferAttribute(this.particleData.sizes, 1)

    this.threeGeometry.setAttribute('position', positionAttribute)
    this.threeGeometry.setAttribute('aColor', colorAttribute)
    this.threeGeometry.setAttribute('aSize', sizeAttribute)

    this.threeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: this.config.particleSize * 100 }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uSize;

        void main() {
          vColor = aColor;
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = uSize * aSize * uPixelRatio;
          gl_PointSize *= (1.0 / -viewPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: this.config.useAdditiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending
    })

    this.points = new THREE.Points(this.threeGeometry, this.threeMaterial)
    this.scene.add(this.points)
  }

  update(dt, camera) {
    this.time += dt

    this.mouseWorldPos.x += (this.targetMouseWorldPos.x - this.mouseWorldPos.x) * 0.1
    this.mouseWorldPos.y += (this.targetMouseWorldPos.y - this.mouseWorldPos.y) * 0.1
    this.mouseWorldPos.z += (this.targetMouseWorldPos.z - this.mouseWorldPos.z) * 0.1

    this.physicsSolver.update(
      dt,
      this.particleData,
      this.mouseWorldPos,
      this.mouseActive
    )

    this.threeGeometry.attributes.position.needsUpdate = true

    if (this.threeMaterial) {
      this.threeMaterial.uniforms.uTime.value = this.time
    }
  }

  setMousePosition(screenX, screenY, camera, width, height) {
    const ndcX = (screenX / width) * 2 - 1
    const ndcY = -(screenY / height) * 2 + 1

    const near = camera.near
    const far = camera.far
    const fov = camera.fov * (Math.PI / 180)
    const aspect = camera.aspect

    const targetZ = 0

    const rayDirection = new THREE.Vector3(ndcX, ndcY, -1)
    rayDirection.unproject(camera)
    rayDirection.sub(camera.position)
    rayDirection.normalize()

    if (Math.abs(rayDirection.z) > 0.0001) {
      const t = (targetZ - camera.position.z) / rayDirection.z
      this.targetMouseWorldPos.x = camera.position.x + rayDirection.x * t
      this.targetMouseWorldPos.y = camera.position.y + rayDirection.y * t
      this.targetMouseWorldPos.z = targetZ
    }
  }

  setMouseActive(active) {
    this.mouseActive = active
  }

  resize() {
    if (this.threeMaterial) {
      this.threeMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }
  }

  updateConfig(newConfig) {
    const needsReinit =
      newConfig.particleCount !== undefined ||
      newConfig.armCount !== undefined ||
      newConfig.coreRadius !== undefined ||
      newConfig.galaxyRadius !== undefined ||
      newConfig.diskHeight !== undefined ||
      newConfig.spiralTightness !== undefined

    Object.assign(this.config, newConfig)

    if (newConfig.rotationSpeed !== undefined) {
      this.physicsSolver.updateConfig({ rotationSpeed: newConfig.rotationSpeed })
    }

    if (newConfig.particleSize !== undefined && this.threeMaterial) {
      this.threeMaterial.uniforms.uSize.value = newConfig.particleSize * 100
    }

    if (needsReinit) {
      this.dispose()
      this.particleData = new ParticleData(this.config.particleCount)
      this.particleData.initialize(this.config)
      this.createThreeObjects()
    }
  }

  dispose() {
    if (this.points) {
      this.scene.remove(this.points)
    }
    if (this.threeGeometry) {
      this.threeGeometry.dispose()
    }
    if (this.threeMaterial) {
      this.threeMaterial.dispose()
    }
  }
}
