<template>
  <div class="heatmap-container" ref="containerRef">
    <canvas ref="canvasRef" class="heatmap-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import { HeatmapEngine } from '../utils/heatmapEngine.js'
import { PitchRenderer } from '../utils/pitchRenderer.js'

const props = defineProps({
  backendPort: {
    type: Number,
    default: 8080
  }
})

const emit = defineEmits(['update:status'])

const containerRef = ref(null)
const canvasRef = ref(null)

let ctx = null
let animationId = null
let ws = null
let heatmapEngine = null
let pitchRenderer = null
let currentPlayers = []
let isConnected = false
let frameCount = 0
let lastFPSUpdate = Date.now()
let totalPoints = 0

const PITCH_WIDTH = 100
const PITCH_HEIGHT = 68

const scaleX = () => canvasRef.value.width / PITCH_WIDTH
const scaleY = () => canvasRef.value.height / PITCH_HEIGHT

const connectWebSocket = () => {
  const wsUrl = `ws://localhost:${props.backendPort}/ws`
  console.log(`尝试连接到: ${wsUrl}`)
  
  try {
    ws = new WebSocket(wsUrl)
  } catch (e) {
    console.error('WebSocket 创建失败:', e)
    return
  }

  ws.onopen = () => {
    console.log('WebSocket 连接成功')
    isConnected = true
    emit('update:status', { connected: true })
  }

  ws.onmessage = (event) => {
    try {
      const players = JSON.parse(event.data)
      currentPlayers = players
      
      for (const player of players) {
        heatmapEngine.addPoint(player.x, player.y, 1)
        totalPoints++
      }
      
      emit('update:status', { totalPoints })
    } catch (e) {
      console.error('解析数据失败:', e)
    }
  }

  ws.onclose = () => {
    console.log('WebSocket 连接关闭')
    isConnected = false
    emit('update:status', { connected: false })
    
    setTimeout(() => {
      if (!isConnected) {
        connectWebSocket()
      }
    }, 3000)
  }

  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error)
  }
}

const resizeCanvas = () => {
  if (!containerRef.value || !canvasRef.value) return

  const container = containerRef.value
  const canvas = canvasRef.value

  const aspectRatio = PITCH_WIDTH / PITCH_HEIGHT
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight

  let width, height
  if (containerWidth / containerHeight > aspectRatio) {
    height = containerHeight
    width = height * aspectRatio
  } else {
    width = containerWidth
    height = width / aspectRatio
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
}

const drawPlayers = (players) => {
  for (const player of players) {
    const px = player.x * scaleX()
    const py = player.y * scaleY()
    const radius = 8

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 2)
    if (player.team === 0) {
      gradient.addColorStop(0, 'rgba(255, 68, 68, 0.9)')
      gradient.addColorStop(0.5, 'rgba(255, 68, 68, 0.5)')
      gradient.addColorStop(1, 'rgba(255, 68, 68, 0)')
    } else {
      gradient.addColorStop(0, 'rgba(68, 136, 255, 0.9)')
      gradient.addColorStop(0.5, 'rgba(68, 136, 255, 0.5)')
      gradient.addColorStop(1, 'rgba(68, 136, 255, 0)')
    }

    ctx.beginPath()
    ctx.arc(px, py, radius * 2, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = player.team === 0 ? '#ff4444' : '#4488ff'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

const renderLoop = () => {
  if (!ctx || !canvasRef.value) return

  const width = canvasRef.value.width / (window.devicePixelRatio || 1)
  const height = canvasRef.value.height / (window.devicePixelRatio || 1)

  ctx.clearRect(0, 0, width, height)

  pitchRenderer.drawPitch(ctx, width, height)
  heatmapEngine.render(ctx, width, height)
  drawPlayers(currentPlayers)

  frameCount++
  const now = Date.now()
  if (now - lastFPSUpdate >= 1000) {
    emit('update:status', { fps: frameCount })
    frameCount = 0
    lastFPSUpdate = now
  }

  animationId = requestAnimationFrame(renderLoop)
}

const clearHeatmap = () => {
  if (heatmapEngine) {
    heatmapEngine.clear()
    totalPoints = 0
    emit('update:status', { totalPoints })
  }
}

defineExpose({ clearHeatmap })

onMounted(() => {
  heatmapEngine = new HeatmapEngine()
  pitchRenderer = new PitchRenderer()

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  connectWebSocket()
  renderLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.heatmap-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.heatmap-canvas {
  border-radius: 8px;
}
</style>
