import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ExplodeMath } from '../math/ExplodeMath'

const CATEGORY_COLORS = {
  Wall: 0x8B4513,
  Floor: 0x696969,
  Roof: 0x8B0000,
  Column: 0x4682B4,
  Beam: 0x2F4F4F,
  Window: 0x87CEEB,
  Door: 0x8B4513,
  Stair: 0x708090,
}

export default function BimViewer({ elements, explodeFactor = 0, onElementClick, visibleCategories }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const instancedMeshesRef = useRef(new Map())
  const explodeMathRef = useRef(null)
  const currentOffsetsRef = useRef(new Map())
  const targetOffsetsRef = useRef(new Map())
  const animationIdRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  const [stats, setStats] = useState({ total: 0, visible: 0, categories: [] })

  const getCategoryColor = useCallback((element) => {
    if (element.color) return new THREE.Color(element.color)
    return new THREE.Color(CATEGORY_COLORS[element.category] || 0xaaaaaa)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(60, 40, 60)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(100, 100, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
    backLight.position.set(-50, 50, -50)
    scene.add(backLight)

    const gridHelper = new THREE.GridHelper(200, 50, 0x888888, 0xcccccc)
    scene.add(gridHelper)

    const axesHelper = new THREE.AxesHelper(10)
    scene.add(axesHelper)

    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    const handleClick = (event) => {
      if (!container || !camera || !onElementClick) return

      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      const meshes = []
      instancedMeshesRef.current.forEach((mesh) => meshes.push(mesh))

      const intersects = raycasterRef.current.intersectObjects(meshes)

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId
        const mesh = intersects[0].object
        const category = mesh.userData.category

        if (instanceId !== undefined) {
          const element = mesh.userData.elements[instanceId]
          if (element && visibleCategories?.includes(category)) {
            onElementClick(element)
          }
        }
      }
    }

    window.addEventListener('resize', handleResize)
    container.addEventListener('click', handleClick)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      controls.update()

      instancedMeshesRef.current.forEach((mesh, category) => {
        const isVisible = !visibleCategories || visibleCategories.includes(category)
        mesh.visible = isVisible

        if (isVisible) {
          updateMeshPositions(mesh, category)
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('click', handleClick)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  const updateMeshPositions = useCallback((mesh, category) => {
    const dummy = new THREE.Object3D()
    const elements = mesh.userData.elements

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const currentOffset = currentOffsetsRef.current.get(element.id) || new THREE.Vector3(0, 0, 0)
      const targetOffset = targetOffsetsRef.current.get(element.id) || new THREE.Vector3(0, 0, 0)

      const newOffset = currentOffset.clone().lerp(targetOffset, 0.1)
      currentOffsetsRef.current.set(element.id, newOffset)

      dummy.position.set(
        element.position.x + newOffset.x,
        element.position.y + newOffset.y,
        element.position.z + newOffset.z
      )

      dummy.scale.set(element.size.x, element.size.y, element.size.z)

      if (element.rotation) {
        dummy.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z)
      }

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useEffect(() => {
    if (!elements || elements.length === 0) return

    const scene = sceneRef.current
    if (!scene) return

    instancedMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    })
    instancedMeshesRef.current.clear()

    const explodeMath = new ExplodeMath(elements)
    explodeMathRef.current = explodeMath

    const categoryMap = new Map()
    elements.forEach((element) => {
      if (!categoryMap.has(element.category)) {
        categoryMap.set(element.category, [])
      }
      categoryMap.get(element.category).push(element)
    })

    const geometry = new THREE.BoxGeometry(1, 1, 1)

    categoryMap.forEach((categoryElements, category) => {
      const material = new THREE.MeshPhongMaterial({
        color: CATEGORY_COLORS[category] || 0xaaaaaa,
        flatShading: false,
      })

      const instancedMesh = new THREE.InstancedMesh(geometry, material, categoryElements.length)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      instancedMesh.userData = { category, elements: categoryElements }

      const dummy = new THREE.Object3D()
      categoryElements.forEach((element, index) => {
        dummy.position.set(element.position.x, element.position.y, element.position.z)
        dummy.scale.set(element.size.x, element.size.y, element.size.z)
        if (element.rotation) {
          dummy.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z)
        }
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(index, dummy.matrix)

        const color = getCategoryColor(element)
        instancedMesh.setColorAt(index, color)
      })

      instancedMesh.instanceMatrix.needsUpdate = true
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true
      }

      scene.add(instancedMesh)
      instancedMeshesRef.current.set(category, instancedMesh)
    })

    currentOffsetsRef.current.clear()
    targetOffsetsRef.current.clear()
    elements.forEach((element) => {
      currentOffsetsRef.current.set(element.id, new THREE.Vector3(0, 0, 0))
      targetOffsetsRef.current.set(element.id, new THREE.Vector3(0, 0, 0))
    })

    const categories = Array.from(categoryMap.keys())
    setStats({
      total: elements.length,
      visible: elements.length,
      categories,
    })

    if (cameraRef.current && controlsRef.current) {
      const globalCenter = explodeMath.getGlobalCenter()
      controlsRef.current.target.copy(globalCenter)
      cameraRef.current.lookAt(globalCenter)
    }
  }, [elements, getCategoryColor])

  useEffect(() => {
    if (!explodeMathRef.current) return

    const results = explodeMathRef.current.computeExplodeOffsets(explodeFactor)
    results.forEach(({ elementId, offset }) => {
      targetOffsetsRef.current.set(elementId, offset)
    })
  }, [explodeFactor])

  useEffect(() => {
    if (!visibleCategories) {
      setStats((prev) => ({ ...prev, visible: prev.total }))
      return
    }

    let visibleCount = 0
    instancedMeshesRef.current.forEach((mesh, category) => {
      if (visibleCategories.includes(category)) {
        visibleCount += mesh.userData.elements.length
      }
    })
    setStats((prev) => ({ ...prev, visible: visibleCount }))
  }, [visibleCategories])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <div className="text-sm space-y-1">
          <div className="font-semibold text-gray-800">模型统计</div>
          <div className="text-gray-600">总构件数: {stats.total}</div>
          <div className="text-gray-600">可见构件: {stats.visible}</div>
          <div className="text-gray-600">分类数: {stats.categories.length}</div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <div className="font-semibold text-gray-800 mb-2">图例</div>
        <div className="grid grid-cols-2 gap-2">
          {stats.categories.map((category) => {
            const colorHex = '#' + (CATEGORY_COLORS[category] || 0xaaaaaa).toString(16).padStart(6, '0')
            const isVisible = !visibleCategories || visibleCategories.includes(category)
            return (
              <div key={category} className={`flex items-center gap-2 text-sm ${isVisible ? '' : 'opacity-50'}`}>
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: colorHex }}
                />
                <span className="text-gray-700">{category}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
