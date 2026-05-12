import { Scene, Vector3, Mesh, MeshBuilder, Material, Color3, Color4, Engine, HemisphericLight, ShadowGenerator, DirectionalLight, FreeCamera, ArcRotateCamera, DynamicTexture, StandardMaterial, PickingInfo, Ray } from '@babylonjs/core'
import { Building, SunPosition, ShadowAreaResult } from '../types'

export class ShadowCaptureEngine {
  private engine: Engine
  private scene: Scene
  private camera: ArcRotateCamera
  private directionalLight: DirectionalLight | null = null
  private shadowGenerator: ShadowGenerator | null = null
  private buildingMeshes: Mesh[] = []
  private buildingData: Building[] = []
  private groundPlane: Mesh | null = null
  private groundArea: number = 0
  private GROUND_SIZE = 500
  private SHADOW_MAP_SIZE = 2048

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.1, 0.12, 0.15, 1)

    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,
      Math.PI / 3,
      250,
      Vector3.Zero(),
      this.scene
    )
    this.camera.attachControl(canvas, true)
    this.camera.lowerRadiusLimit = 50
    this.camera.upperRadiusLimit = 500

    const ambient = new HemisphericLight(
      'ambient',
      new Vector3(0, 1, 0),
      this.scene
    )
    ambient.intensity = 0.4
    ambient.diffuse = Color3.FromHexString('#ffffff')
    ambient.groundColor = Color3.FromHexString('#333340')

    this.createGround()

    this.engine.runRenderLoop(() => {
      this.scene.render()
    })

    window.addEventListener('resize', () => {
      this.engine.resize()
    })
  }

  private createGround(): void {
    this.groundPlane = MeshBuilder.CreateGround(
      'ground',
      { width: this.GROUND_SIZE, height: this.GROUND_SIZE },
      this.scene
    )
    this.groundPlane.receiveShadows = true
    this.groundArea = this.GROUND_SIZE * this.GROUND_SIZE

    const groundMaterial = new StandardMaterial('groundMat', this.scene)
    groundMaterial.diffuseColor = Color3.FromHexString('#1a2332')
    groundMaterial.specularColor = Color3.Black()
    groundMaterial.emissiveColor = Color3.FromHexString('#0a0e14')
    this.groundPlane.material = groundMaterial

    this.createGrid()
  }

  private createGrid(): void {
    const gridSize = this.GROUND_SIZE
    const gridStep = 10
    const gridLines: Mesh[] = []

    const gridMaterial = new StandardMaterial('gridMat', this.scene)
    gridMaterial.emissiveColor = Color3.FromHexString('#2a3a4a')
    gridMaterial.disableLighting = true

    for (let i = -gridSize / 2; i <= gridSize / 2; i += gridStep) {
      const lineX = MeshBuilder.CreateLines(
        'gridX',
        {
          points: [
            new Vector3(i, 0.01, -gridSize / 2),
            new Vector3(i, 0.01, gridSize / 2)
          ]
        },
        this.scene
      )
      lineX.color = Color3.FromHexString('#2a3a4a')
      gridLines.push(lineX)

      const lineZ = MeshBuilder.CreateLines(
        'gridZ',
        {
          points: [
            new Vector3(-gridSize / 2, 0.01, i),
            new Vector3(gridSize / 2, 0.01, i)
          ]
        },
        this.scene
      )
      lineZ.color = Color3.FromHexString('#2a3a4a')
      gridLines.push(lineZ)
    }
  }

  public loadBuildings(buildings: Building[]): void {
    this.buildingMeshes.forEach(b => b.dispose())
    this.buildingMeshes = []
    this.buildingData = []

    buildings.forEach(building => {
      const mesh = MeshBuilder.CreateBox(
        building.id,
        {
          width: building.width,
          height: building.height,
          depth: building.depth
        },
        this.scene
      )

      mesh.position = new Vector3(
        building.x,
        building.height / 2,
        building.z
      )

      const material = new StandardMaterial(`${building.id}-mat`, this.scene)
      material.diffuseColor = Color3.FromHexString('#4a90b8')
      material.specularColor = Color3.FromHexString('#2a4a6a')
      material.emissiveColor = Color3.FromHexString('#1a3a4a')
      mesh.material = material

      this.buildingMeshes.push(mesh)
      this.buildingData.push(building)
    })

    this.setupShadowGenerator()
  }

  private setupShadowGenerator(): void {
    if (this.directionalLight) {
      this.directionalLight.dispose()
    }
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose()
    }

    this.directionalLight = new DirectionalLight(
      'sun',
      new Vector3(0, -1, 0),
      this.scene
    )
    this.directionalLight.intensity = 1.5
    this.directionalLight.diffuse = Color3.FromHexString('#fff8e0')
    this.directionalLight.specular = Color3.FromHexString('#fffacd')

    this.shadowGenerator = new ShadowGenerator(this.SHADOW_MAP_SIZE, this.directionalLight)
    this.shadowGenerator.useBlurExponentialShadowMap = true
    this.shadowGenerator.blurScale = 2
    this.shadowGenerator.bias = 0.001

    this.buildingMeshes.forEach(building => {
      this.shadowGenerator!.addShadowCaster(building)
    })
  }

  public updateSunPosition(sunPosition: SunPosition): void {
    if (!this.directionalLight) return

    const altitudeRad = (sunPosition.altitude * Math.PI) / 180
    const azimuthRad = (sunPosition.azimuth * Math.PI) / 180

    const distance = 200
    const x = distance * Math.sin(azimuthRad) * Math.cos(altitudeRad)
    const y = distance * Math.sin(altitudeRad)
    const z = distance * Math.cos(azimuthRad) * Math.cos(altitudeRad)

    this.directionalLight.position = new Vector3(x, y, z)
    this.directionalLight.direction = new Vector3(-x, -y, -z).normalize()

    if (sunPosition.altitude <= 0) {
      this.directionalLight.intensity = 0
    } else {
      this.directionalLight.intensity = 0.5 + Math.sin(altitudeRad)
    }
  }

  public calculateShadowArea(): ShadowAreaResult {
    if (!this.directionalLight || this.buildingData.length === 0) {
      return { area: 0, ratio: 0 }
    }

    const sunDir = this.directionalLight.direction
    const gridSize = 200
    const cellSize = 2
    const halfSize = gridSize / 2
    let shadowCells = 0
    let totalCells = 0

    const dx = -sunDir.x / Math.max(Math.abs(sunDir.y), 0.001)
    const dz = -sunDir.z / Math.max(Math.abs(sunDir.y), 0.001)

    for (let gx = -halfSize; gx < halfSize; gx += cellSize) {
      for (let gz = -halfSize; gz < halfSize; gz += cellSize) {
        totalCells++

        if (this.testPointShadow(gx, gz, dx, dz)) {
          shadowCells++
        }
      }
    }

    const cellArea = cellSize * cellSize
    const shadowArea = shadowCells * cellArea
    const totalArea = totalCells * cellArea
    const ratio = totalArea > 0 ? (shadowArea / totalArea) * 100 : 0

    return {
      area: Math.round(shadowArea * 100) / 100,
      ratio: Math.round(ratio * 100) / 100
    }
  }

  private testPointShadow(px: number, pz: number, dx: number, dz: number): boolean {
    for (const building of this.buildingData) {
      const minX = building.x - building.width / 2
      const maxX = building.x + building.width / 2
      const minZ = building.z - building.depth / 2
      const maxZ = building.z + building.depth / 2

      const steps = 200
      for (let h = 1; h <= steps; h++) {
        const testX = px + dx * h
        const testZ = pz + dz * h

        if (testX >= minX && testX <= maxX &&
            testZ >= minZ && testZ <= maxZ) {
          return true
        }
      }
    }
    return false
  }

  public dispose(): void {
    this.engine.dispose()
  }
}
