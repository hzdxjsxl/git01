import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GalaxyParticleSystem } from '../particles/index.js'

export class App {
  constructor(container) {
    this.container = container
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.galaxy = null

    this.clock = new THREE.Clock()
    this.isRunning = false
    this.animationId = null

    this.init()
  }

  init() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createControls()
    this.createGalaxy()
    this.setupEventListeners()

    this.isRunning = true
    this.animate()
  }

  createScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000008)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
    this.scene.add(ambientLight)

    const bgGeometry = new THREE.BufferGeometry()
    const bgCount = 2000
    const bgPositions = new Float32Array(bgCount * 3)

    for (let i = 0; i < bgCount; i++) {
      const i3 = i * 3
      bgPositions[i3] = (Math.random() - 0.5) * 400
      bgPositions[i3 + 1] = (Math.random() - 0.5) * 400
      bgPositions[i3 + 2] = (Math.random() - 0.5) * 400
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3))

    const bgMaterial = new THREE.PointsMaterial({
      color: 0x4466aa,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    })

    const bgPoints = new THREE.Points(bgGeometry, bgMaterial)
    this.scene.add(bgPoints)
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.width / this.height,
      0.1,
      1000
    )
    this.camera.position.set(0, 40, 80)
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 20
    this.controls.maxDistance = 200
    this.controls.maxPolarAngle = Math.PI
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.3
    this.controls.target.set(0, 0, 0)
  }

  createGalaxy() {
    this.galaxy = new GalaxyParticleSystem(this.scene, {
      particleCount: 100000,
      armCount: 4,
      coreRadius: 5,
      galaxyRadius: 50,
      diskHeight: 3,
      spiralTightness: 0.12,
      rotationSpeed: 0.3,
      particleSize: 1.2,
      useAdditiveBlending: true
    })
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this))

    const canvas = this.renderer.domElement

    canvas.addEventListener('mousemove', (e) => {
      if (this.galaxy) {
        this.galaxy.setMousePosition(
          e.clientX,
          e.clientY,
          this.camera,
          this.width,
          this.height
        )
        this.galaxy.setMouseActive(true)
      }
    })

    canvas.addEventListener('mouseleave', () => {
      if (this.galaxy) {
        this.galaxy.setMouseActive(false)
      }
    })

    canvas.addEventListener('mouseenter', () => {
      if (this.galaxy) {
        this.galaxy.setMouseActive(true)
      }
    })
  }

  onResize() {
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    if (this.galaxy) {
      this.galaxy.resize()
    }
  }

  animate() {
    if (!this.isRunning) return

    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const dt = Math.min(this.clock.getDelta(), 0.1)

    if (this.controls) {
      this.controls.update()
    }

    if (this.galaxy) {
      this.galaxy.update(dt, this.camera)
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    window.removeEventListener('resize', this.onResize.bind(this))

    if (this.galaxy) {
      this.galaxy.dispose()
    }

    if (this.controls) {
      this.controls.dispose()
    }

    if (this.renderer) {
      this.renderer.dispose()
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
      }
    }
  }
}
