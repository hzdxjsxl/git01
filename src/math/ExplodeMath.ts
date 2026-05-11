import * as THREE from 'three'

export interface BimElement {
  id: string
  category: string
  position: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  color?: string
}

export interface CategoryCenter {
  category: string
  center: THREE.Vector3
  elements: BimElement[]
}

export interface ExplodeResult {
  elementId: string
  offset: THREE.Vector3
}

export class ExplodeMath {
  private elements: BimElement[] = []
  private categoryCenters: Map<string, THREE.Vector3> = new Map()
  private globalCenter: THREE.Vector3 = new THREE.Vector3()
  private _cachedOffsets: Map<string, THREE.Vector3> = new Map()
  private _lastExplodeFactor: number = 0

  constructor(elements: BimElement[] = []) {
    this.setElements(elements)
  }

  setElements(elements: BimElement[]): void {
    this.elements = [...elements]
    this.computeAllCenters()
    this._cachedOffsets.clear()
    this._lastExplodeFactor = 0
  }

  private computeAllCenters(): void {
    const categoryMap = new Map<string, BimElement[]>()

    for (const element of this.elements) {
      if (!categoryMap.has(element.category)) {
        categoryMap.set(element.category, [])
      }
      categoryMap.get(element.category)!.push(element)
    }

    this.categoryCenters.clear()
    let totalCenter = new THREE.Vector3()
    let totalWeight = 0

    for (const [category, categoryElements] of categoryMap) {
      const categoryCenter = this.computeCategoryCenter(categoryElements)
      this.categoryCenters.set(category, categoryCenter)

      totalCenter.addScaledVector(categoryCenter, categoryElements.length)
      totalWeight += categoryElements.length
    }

    if (totalWeight > 0) {
      this.globalCenter = totalCenter.divideScalar(totalWeight)
    }
  }

  private computeCategoryCenter(elements: BimElement[]): THREE.Vector3 {
    if (elements.length === 0) return new THREE.Vector3()

    const center = new THREE.Vector3()
    for (const element of elements) {
      center.add(new THREE.Vector3(element.position.x, element.position.y, element.position.z))
    }
    return center.divideScalar(elements.length)
  }

  getGlobalCenter(): THREE.Vector3 {
    return this.globalCenter.clone()
  }

  getCategoryCenter(category: string): THREE.Vector3 | null {
    return this.categoryCenters.get(category)?.clone() || null
  }

  getCategoryCenters(): Map<string, THREE.Vector3> {
    return new Map(this.categoryCenters)
  }

  computeExplodeOffsets(explodeFactor: number = 1): ExplodeResult[] {
    if (explodeFactor === this._lastExplodeFactor && this._cachedOffsets.size > 0) {
      return this.getCachedOffsets()
    }

    this._cachedOffsets.clear()

    if (explodeFactor <= 0 || this.elements.length === 0) {
      for (const element of this.elements) {
        this._cachedOffsets.set(element.id, new THREE.Vector3(0, 0, 0))
      }
    } else {
      for (const element of this.elements) {
        const offset = this.computeElementOffset(element, explodeFactor)
        this._cachedOffsets.set(element.id, offset)
      }
    }

    this._lastExplodeFactor = explodeFactor
    return this.getCachedOffsets()
  }

  private computeElementOffset(element: BimElement, explodeFactor: number): THREE.Vector3 {
    const elementCenter = new THREE.Vector3(element.position.x, element.position.y, element.position.z)
    const categoryCenter = this.categoryCenters.get(element.category)

    if (!categoryCenter) {
      return new THREE.Vector3(0, 0, 0)
    }

    const categoryToGlobal = this.globalCenter.clone().sub(categoryCenter).normalize()
    const categoryRadius = this.computeCategoryRadius(element.category)

    const elementInCategory = elementCenter.clone().sub(categoryCenter)
    const elementDistance = elementInCategory.length()
    const elementDirection = elementDistance > 0 ? elementInCategory.normalize() : new THREE.Vector3(0, 0, 0)

    const categoryOffset = categoryToGlobal.multiplyScalar(explodeFactor * categoryRadius * 0.5)

    const elementExplodeRadius = Math.sqrt(
      Math.pow(element.size.x, 2) + Math.pow(element.size.y, 2) + Math.pow(element.size.z, 2)
    ) * 0.5

    const elementOffset = elementDirection.multiplyScalar(explodeFactor * (elementExplodeRadius + elementDistance) * 0.3)

    return categoryOffset.add(elementOffset)
  }

  private computeCategoryRadius(category: string): number {
    const categoryCenter = this.categoryCenters.get(category)
    if (!categoryCenter) return 0

    let maxDistance = 0
    for (const element of this.elements) {
      if (element.category === category) {
        const elementCenter = new THREE.Vector3(element.position.x, element.position.y, element.position.z)
        const distance = elementCenter.distanceTo(categoryCenter)
        const elementRadius = Math.sqrt(
          Math.pow(element.size.x, 2) + Math.pow(element.size.y, 2) + Math.pow(element.size.z, 2)
        ) * 0.5
        maxDistance = Math.max(maxDistance, distance + elementRadius)
      }
    }

    return maxDistance
  }

  private getCachedOffsets(): ExplodeResult[] {
    const results: ExplodeResult[] = []
    for (const [elementId, offset] of this._cachedOffsets) {
      results.push({ elementId, offset: offset.clone() })
    }
    return results
  }

  getElementOffset(elementId: string, explodeFactor: number): THREE.Vector3 {
    if (explodeFactor !== this._lastExplodeFactor) {
      this.computeExplodeOffsets(explodeFactor)
    }
    return this._cachedOffsets.get(elementId)?.clone() || new THREE.Vector3(0, 0, 0)
  }

  static createTestData(count: number = 100): BimElement[] {
    const categories = ['Wall', 'Floor', 'Roof', 'Column', 'Beam', 'Window', 'Door', 'Stair']
    const elements: BimElement[] = []

    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      elements.push({
        id: `element_${i}`,
        category,
        position: {
          x: (Math.random() - 0.5) * 50,
          y: (Math.random() - 0.5) * 20,
          z: (Math.random() - 0.5) * 50,
        },
        size: {
          x: 1 + Math.random() * 5,
          y: 0.2 + Math.random() * 3,
          z: 1 + Math.random() * 5,
        },
        color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
      })
    }

    return elements
  }

  static lerp(from: THREE.Vector3, to: THREE.Vector3, t: number): THREE.Vector3 {
    return from.clone().lerp(to, t)
  }

  static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }
}
