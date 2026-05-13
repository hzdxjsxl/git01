<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useBoardStore, BOARD_WIDTH, BOARD_HEIGHT } from './stores/board'
import PixelCanvas from './components/PixelCanvas.vue'
import Toolbar from './components/Toolbar.vue'

const store = useBoardStore()

onMounted(() => {
  store.connect()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  store.disconnect()
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      store.redo()
    } else {
      store.undo()
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    store.redo()
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🎨 多人协作像素画板</h1>
      <div class="status">
        <span :class="['dot', store.connected ? 'online' : 'offline']"></span>
        <span>{{ store.connected ? '已连接' : '未连接' }}</span>
      </div>
    </header>
    <main class="main">
      <Toolbar />
      <div class="canvas-wrapper">
        <PixelCanvas />
      </div>
    </main>
    <footer class="footer">
      <span>画板尺寸: {{ BOARD_WIDTH }} x {{ BOARD_HEIGHT }}</span>
      <span>Ctrl+Z 撤销 | Ctrl+Shift+Z 重做</span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

.header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header h1 {
  font-size: 22px;
  font-weight: 600;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.online {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.dot.offline {
  background: #ef4444;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  gap: 20px;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.footer {
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
