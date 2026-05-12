import { ShadowCaptureEngine } from './engine/ShadowCaptureEngine'
import { SunTrajectory } from './utils/SunTrajectory'
import { fetchBuildings } from './api/buildings'
import { Building, SunPosition } from './types'

let engine: ShadowCaptureEngine | null = null
let buildings: Building[] = []
let currentSunPosition: SunPosition | null = null

function setLoading(show: boolean): void {
  const loadingEl = document.getElementById('loading')
  if (loadingEl) {
    loadingEl.style.display = show ? 'block' : 'none'
  }
}

function updateUI(sunPosition: SunPosition): void {
  const altitudeEl = document.getElementById('altitude')
  const azimuthEl = document.getElementById('azimuth')

  if (altitudeEl) {
    altitudeEl.textContent = `${sunPosition.altitude.toFixed(2)}°`
  }
  if (azimuthEl) {
    azimuthEl.textContent = `${sunPosition.azimuth.toFixed(2)}°`
  }
}

function updateShadowStats(shadowArea: number, shadowRatio: number): void {
  const areaEl = document.getElementById('shadowArea')
  const ratioEl = document.getElementById('shadowRatio')

  if (areaEl) {
    areaEl.textContent = shadowArea.toLocaleString()
  }
  if (ratioEl) {
    ratioEl.textContent = shadowRatio.toFixed(2)
  }
}

function renderBuildingList(buildings: Building[]): void {
  const listEl = document.getElementById('buildingList')
  if (!listEl) return

  listEl.innerHTML = ''

  buildings.forEach(b => {
    const item = document.createElement('div')
    item.className = 'building-item'
    item.innerHTML = `
      <span class="building-name">${b.name}</span>
      <span class="building-dim">${b.width}×${b.depth}×${b.height}m</span>
    `
    listEl.appendChild(item)
  })
}

function getDateFromInputs(): Date {
  const dateInput = document.getElementById('date') as HTMLInputElement
  const timeInput = document.getElementById('time') as HTMLInputElement

  let dateStr = dateInput?.value
  let timeStr = timeInput?.value

  if (!dateStr) {
    const today = new Date()
    dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  if (!timeStr) {
    timeStr = '12:00'
  }

  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date(dateStr)
  date.setHours(hours, minutes, 0, 0)

  return date
}

function calculateSunlight(): void {
  const longitudeInput = document.getElementById('longitude') as HTMLInputElement
  const latitudeInput = document.getElementById('latitude') as HTMLInputElement

  const longitude = parseFloat(longitudeInput?.value || '0')
  const latitude = parseFloat(latitudeInput?.value || '0')
  const date = getDateFromInputs()

  currentSunPosition = SunTrajectory.calculate({
    latitude,
    longitude,
    date
  })

  updateUI(currentSunPosition)

  if (engine) {
    engine.updateSunPosition(currentSunPosition)

    setTimeout(() => {
      if (engine) {
        const result = engine.calculateShadowArea()
        updateShadowStats(result.area, result.ratio)
      }
    }, 100)
  }
}

async function init(): Promise<void> {
  setLoading(true)

  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas element not found')
    return
  }

  engine = new ShadowCaptureEngine(canvas)

  const dateInput = document.getElementById('date') as HTMLInputElement
  if (dateInput) {
    const today = new Date()
    dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  try {
    buildings = await fetchBuildings()
    engine.loadBuildings(buildings)
    renderBuildingList(buildings)
  } catch (error) {
    console.error('Failed to load buildings:', error)
  }

  const calculateBtn = document.getElementById('calculateBtn')
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateSunlight)
  }

  calculateSunlight()

  setLoading(false)
}

document.addEventListener('DOMContentLoaded', init)

window.addEventListener('beforeunload', () => {
  if (engine) {
    engine.dispose()
  }
})
