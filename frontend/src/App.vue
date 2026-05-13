<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>⚽ 足球比赛实时跑动热力图大屏</h1>
      <div class="status-bar">
        <span class="status-item" :class="{ connected: isConnected }">
          <span class="status-dot"></span>
          {{ isConnected ? '已连接' : '连接中...' }}
        </span>
        <span class="status-item">
          帧率: {{ fps }} FPS
        </span>
        <span class="status-item">
          数据点: {{ totalPoints }}
        </span>
      </div>
    </header>
    <main class="dashboard-main">
      <HeatmapCanvas
        ref="heatmapRef"
        :backend-port="backendPort"
        @update:status="handleStatusUpdate"
      />
    </main>
    <footer class="dashboard-footer">
      <div class="controls">
        <button @click="clearHeatmap" class="control-btn">清除热力图</button>
        <div class="team-legend">
          <div class="legend-item">
            <span class="team-dot team-0"></span>
            <span>主队</span>
          </div>
          <div class="legend-item">
            <span class="team-dot team-1"></span>
            <span>客队</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HeatmapCanvas from './components/HeatmapCanvas.vue'

const heatmapRef = ref(null)
const isConnected = ref(false)
const fps = ref(0)
const totalPoints = ref(0)
const backendPort = ref(parseInt(import.meta.env.VITE_BACKEND_PORT || '8080'))

const handleStatusUpdate = (status) => {
  if (status.connected !== undefined) {
    isConnected.value = status.connected
  }
  if (status.fps !== undefined) {
    fps.value = status.fps
  }
  if (status.totalPoints !== undefined) {
    totalPoints.value = status.totalPoints
  }
}

const clearHeatmap = () => {
  if (heatmapRef.value) {
    heatmapRef.value.clearHeatmap()
  }
}

onMounted(() => {
  console.log('热力图大屏已启动')
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
}

.dashboard-header {
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff 0%, #7b2ff7 50%, #ff00aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
}

.status-bar {
  display: flex;
  gap: 30px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #8892b0;
}

.status-item.connected {
  color: #00ff88;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4444;
  animation: pulse 2s infinite;
}

.status-item.connected .status-dot {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.dashboard-main {
  flex: 1;
  padding: 20px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-footer {
  padding: 15px 40px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-btn {
  padding: 10px 24px;
  background: linear-gradient(90deg, #00d4ff 0%, #7b2ff7 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);
}

.control-btn:active {
  transform: translateY(0);
}

.team-legend {
  display: flex;
  gap: 30px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8892b0;
  font-size: 14px;
}

.team-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.team-0 {
  background: #ff4444;
  box-shadow: 0 0 8px rgba(255, 68, 68, 0.6);
}

.team-1 {
  background: #4488ff;
  box-shadow: 0 0 8px rgba(68, 136, 255, 0.6);
}
</style>
