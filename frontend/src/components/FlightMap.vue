<template>
  <div ref="mapContainer" style="width: 100%; height: 100%; position: relative;">
    <div class="header-panel">
      <h1>✈️ 飞机动态监控大盘</h1>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-value">{{ planeCount }}</span>
          <span class="stat-label">监控飞机</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ connectionStatus ? '🟢 已连接' : '🔴 断开' }}</span>
          <span class="stat-label">服务器状态</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ fps.toFixed(0) }}</span>
          <span class="stat-label">渲染帧率</span>
        </div>
      </div>
    </div>
    
    <div class="legend-panel">
      <h3>图例</h3>
      <div class="legend-item">
        <div class="legend-dot" style="background: #2196F3;"></div>
        <span>飞行中</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #4CAF50;"></div>
        <span>高速 (>=700km/h)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #FF9800;"></div>
        <span>中速 (500-700km/h)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #F44336;"></div>
        <span>低速 (<500km/h)</span>
      </div>
    </div>
    
    <div ref="popupEl" class="ol-popup" v-show="selectedPlane">
      <template v-if="selectedPlane">
        <div><strong>{{ selectedPlane.flight_number }}</strong></div>
        <div>航速: {{ selectedPlane.speed_kmh.toFixed(0) }} km/h</div>
        <div>航向: {{ selectedPlane.heading.toFixed(1) }}°</div>
        <div>位置: {{ selectedPlane.latitude.toFixed(4) }}°N, {{ selectedPlane.longitude.toFixed(4) }}°E</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Icon, Style, Text, Fill, Stroke } from 'ol/style'
import Overlay from 'ol/Overlay'
import { KinematicEngine, InferredPosition } from '../utils/KinematicEngine'

const mapContainer = ref<HTMLDivElement | null>(null)
const popupEl = ref<HTMLDivElement | null>(null)
const planeCount = ref(0)
const connectionStatus = ref(false)
const fps = ref(0)
const selectedPlane = ref<InferredPosition | null>(null)

let map: Map | null = null
let vectorSource: VectorSource | null = null
let vectorLayer: VectorLayer | null = null
let popupOverlay: Overlay | null = null
let ws: WebSocket | null = null
let animationId: number | null = null
let lastRenderTime: number = performance.now()
let frameCount: number = 0
let fpsTimer: number = 0

const kinematicEngine = new KinematicEngine()
const featureMap: Record<string, Feature> = {}

function createPlaneStyle(speedKmh: number): Style {
  let color: string
  if (speedKmh >= 700) {
    color = '#4CAF50'
  } else if (speedKmh >= 500) {
    color = '#FF9800'
  } else {
    color = '#F44336'
  }
  
  return new Style({
    image: new Icon({
      src: 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <path d="M16 2 L18 14 L28 18 L18 22 L16 30 L14 22 L4 18 L14 14 Z" 
                fill="${color}" stroke="white" stroke-width="1"/>
        </svg>`
      ),
      anchor: [0.5, 0.5],
      scale: 0.8,
    }),
    text: new Text({
      text: '',
      offsetY: 18,
      font: '12px sans-serif',
      fill: new Fill({ color: '#fff' }),
      stroke: new Stroke({ color: '#000', width: 2 }),
    }),
  })
}

function initMap() {
  if (!mapContainer.value) return
  
  vectorSource = new VectorSource()
  vectorLayer = new VectorLayer({
    source: vectorSource,
    style: (feature) => {
      const speed = feature.get('speed') || 500
      const style = createPlaneStyle(speed)
      const heading = feature.get('heading') || 0
      const icon = style.getImage()
      if (icon) {
        icon.setRotation((heading * Math.PI) / 180)
      }
      return style
    },
  })

  map = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      vectorLayer,
    ],
    view: new View({
      center: fromLonLat([121.4737, 31.2304]),
      zoom: 9,
    }),
  })

  popupOverlay = new Overlay({
    element: popupEl.value!,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  })
  map.addOverlay(popupOverlay!)

  map.on('click', (evt) => {
    const feature = map?.forEachFeatureAtPixel(evt.pixel, (feat) => feat)
    if (feature) {
      const plane = feature.get('planeData') as InferredPosition
      if (plane) {
        selectedPlane.value = plane
        popupOverlay?.setPosition(evt.coordinate)
      }
    } else {
      selectedPlane.value = null
    }
  })
}

function updatePlaneFeatures(positions: InferredPosition[]) {
  if (!vectorSource) return

  const currentIds = new Set<string>()
  
  for (const pos of positions) {
    currentIds.add(pos.id)
    
    let feature = featureMap[pos.id]
    
    if (!feature) {
      feature = new Feature({
        geometry: new Point(fromLonLat([pos.longitude, pos.latitude])),
      })
      featureMap[pos.id] = feature
      vectorSource.addFeature(feature)
    }

    const geometry = feature.getGeometry() as Point
    geometry.setCoordinates(fromLonLat([pos.longitude, pos.latitude]))
    
    feature.set('speed', pos.speed_kmh)
    feature.set('heading', pos.heading)
    feature.set('planeData', pos)
  }

  const idsToRemove: string[] = []
  for (const id of Object.keys(featureMap)) {
    if (!currentIds.has(id)) {
      idsToRemove.push(id)
      vectorSource.removeFeature(featureMap[id])
    }
  }
  for (const id of idsToRemove) {
    delete featureMap[id]
  }

  planeCount.value = positions.length
}

function renderLoop(timestamp: number) {
  frameCount++
  const elapsed = timestamp - lastRenderTime
  if (elapsed >= 1000) {
    fps.value = (frameCount * 1000) / elapsed
    frameCount = 0
    lastRenderTime = timestamp
  }

  const currentTime = timestamp / 1000
  const positions = kinematicEngine.getPositionsAt(currentTime)
  updatePlaneFeatures(positions)

  animationId = requestAnimationFrame(renderLoop)
}

function connectWebSocket() {
  const wsUrl = 'ws://localhost:8000/ws/flights/'
  
  ws = new WebSocket(wsUrl)
  
  ws.onopen = () => {
    connectionStatus.value = true
    console.log('WebSocket connected')
  }
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('Received data:', data.timestamp, 'planes:', data.planes?.length || 0)
      kinematicEngine.updateFromServer(data.planes, data.timestamp)
    } catch (e) {
      console.error('WebSocket message parse error:', e, 'data:', event.data?.substring(0, 200))
    }
  }
  
  ws.onclose = (event) => {
    connectionStatus.value = false
    console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
    setTimeout(() => {
      if (ws?.readyState !== WebSocket.OPEN) {
        connectWebSocket()
      }
    }, 3000)
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    connectionStatus.value = false
  }
}

onMounted(() => {
  initMap()
  connectWebSocket()
  animationId = requestAnimationFrame(renderLoop)
})

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
  if (ws) {
    ws.close()
  }
  if (map) {
    map.dispose()
  }
  kinematicEngine.clear()
})
</script>
