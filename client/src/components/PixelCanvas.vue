<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useBoardStore, BOARD_WIDTH, BOARD_HEIGHT } from '../stores/board'

const store = useBoardStore()
const canvasRef = ref(null)
const PIXEL_SIZE = 10

let ctx = null
let imageData = null
let isDrawing = false

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = BOARD_WIDTH * PIXEL_SIZE
  canvas.height = BOARD_HEIGHT * PIXEL_SIZE
  ctx = canvas.getContext('2d')
  imageData = ctx.createImageData(canvas.width, canvas.height)
  render()
}

function render() {
  if (!ctx || !imageData) return
  const data = imageData.data
  const pixels = store.pixels

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const pixel = pixels[y * BOARD_WIDTH + x]
      const r = (pixel >> 16) & 0xff
      const g = (pixel >> 8) & 0xff
      const b = pixel & 0xff
      const a = (pixel >> 24) & 0xff

      for (let py = 0; py < PIXEL_SIZE; py++) {
        for (let px = 0; px < PIXEL_SIZE; px++) {
          const idx = ((y * PIXEL_SIZE + py) * canvasRef.value.width + (x * PIXEL_SIZE + px)) * 4
          data[idx] = r
          data[idx + 1] = g
          data[idx + 2] = b
          data[idx + 3] = a || 255
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function getPixelPos(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX / PIXEL_SIZE)
  const y = Math.floor((e.clientY - rect.top) * scaleY / PIXEL_SIZE)
  return { x, y }
}

function handleMouseDown(e) {
  isDrawing = true
  const { x, y } = getPixelPos(e)
  store.setPixel(x, y, store.currentColor)
}

function handleMouseMove(e) {
  if (!isDrawing) return
  const { x, y } = getPixelPos(e)
  store.setPixel(x, y, store.currentColor)
}

function handleMouseUp() {
  isDrawing = false
}

function handleMouseLeave() {
  isDrawing = false
}

onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
})

watch(
  () => store.pixels,
  () => {
    requestAnimationFrame(render)
  },
  { deep: true }
)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="canvas"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  ></canvas>
</template>

<style scoped>
.canvas {
  background: #fff;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: crosshair;
  image-rendering: pixelated;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 100%;
  max-height: 100%;
}
</style>
