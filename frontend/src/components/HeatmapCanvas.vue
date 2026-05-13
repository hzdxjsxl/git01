<template>
  <div class="heatmap-container" ref="containerRef">
    <canvas ref="canvasRef" class="heatmap-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, defineExpose } from 'vue'
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

const scaleX = () => canvasRef.value ? canvasRef.value.width / (window.devicePixelRatio || 1) / PITCH_WIDTH : 1
const scaleY = () => canvasRef.value ? canvasRef.value.height / (window.devicePixelRatio || 1) / PITCH_HEIGHT : 1

const connectWebSocket = () => {
  const wsUrl = `ws://localhost:${props.backendPort}/ws`
  console.log('[Heatmap] 尝试连接到 WebSocket:', wsUrl)
  
  try {
    ws = new WebSocket(wsUrl)
  } catch (e) {
    console.error('[Heatmap] WebSocket 创建失败:', e)
    return
  }

  ws.onopen = () => {
    console.log('[Heatmap] WebSocket 连接成功')
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
      console.error('[Heatmap] 解析数据失败:', e)
    }
  }

  ws.onclose = () => {
    console.log('[Heatmap] WebSocket 连接关闭')
    isConnected = false
    emit('update:status', { connected: false })
    
    setTimeout(() => {
      if (!isConnected) {
        connectWebSocket()
      }
    }, 3000)
  }

  ws.onerror = (error) => {
    console.error('[Heatmap] WebSocket 错误:', error)
  }
}

const resizeCanvas = () => {
  if (!containerRef.value || !canvasRef.value) {
    console.warn('[Heatmap] resizeCanvas: 元素未就绪', {
      container: containerRef.value,
      canvas: canvasRef.value
    })
    return false
  }

  const container = containerRef.value
  const canvas = canvasRef.value

  let containerWidth = container.clientWidth
  let containerHeight = container.clientHeight

  if (containerWidth <= 0 || containerHeight <= 0) {
    containerWidth = 800
    containerHeight = 544
    console.warn('[Heatmap] 容器尺寸无效，使用默认尺寸 800x544')
  }

  const aspectRatio = PITCH_WIDTH / PITCH_HEIGHT
  let width, height

  if (containerWidth / containerHeight > aspectRatio) {
    height = containerHeight
    width = height * aspectRatio
  } else {
    width = containerWidth
    height = width / aspectRatio
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  console.log('[Heatmap] Canvas 尺寸:', {
    logical: `${width.toFixed(0)}x${height.toFixed(0)}`,
    physical: `${canvas.width}x${canvas.height}`,
    dpr
  })

  return true
}

const drawPlayers = (players) => {
  if (!ctx || players.length === 0) return

  const sx = scaleX()
  const sy = scaleY()

  for (const player of players) {
    const px = player.x * sx
    const py = player.y * sy
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
  if (!ctx) {
    resizeCanvas()
    if (!ctx) {
      console.warn('[Heatmap] renderLoop: ctx 仍为 null，跳过帧')
      animationId = requestAnimationFrame(renderLoop)
      return
    }
  }

  const canvas = canvasRef.value
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    resizeCanvas()
    animationId = requestAnimationFrame(renderLoop)
    return
  }

  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

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

onMounted(async () => {
  console.log('[Heatmap] 组件 mounted')
  
  heatmapEngine = new HeatmapEngine()
  pitchRenderer = new PitchRenderer()

  await nextTick()
  console.log('[Heatmap] nextTick 后，检查元素:', {
    container: containerRef.value,
    canvas: canvasRef.value
  })

  const resized = resizeCanvas()
  console.log('[Heatmap] 初始 resizeCanvas 结果:', resized)

  window.addEventListener('resize', resizeCanvas)

  setTimeout(() => {
    console.log('[Heatmap] 延迟再次检查容器尺寸:', {
      width: containerRef.value?.clientWidth,
      height: containerRef.value?.clientHeight
    })
    resizeCanvas()
  }, 100)

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
  min-width: 400px;
  min-height: 272px;
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
