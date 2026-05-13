<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../stores/board'

const store = useBoardStore()
const colorInput = ref('#000000')

const palette = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#78716c', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0',
  '#a5f3fc', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#e7e5e4'
]

function selectColor(hex) {
  colorInput.value = hex
  store.setColorFromHex(hex)
}

function updateColorFromInput() {
  store.setColorFromHex(colorInput.value)
}
</script>

<template>
  <div class="toolbar">
    <div class="colors">
      <div
        v-for="color in palette"
        :key="color"
        class="swatch"
        :style="{ background: color }"
        @click="selectColor(color)"
      ></div>
      <input
        v-model="colorInput"
        type="color"
        class="color-picker"
        @input="updateColorFromInput"
      />
    </div>
    <div class="actions">
      <button
        class="btn"
        :disabled="!store.canUndo"
        @click="store.undo"
      >
        ↶ 撤销
      </button>
      <button
        class="btn"
        :disabled="!store.canRedo"
        @click="store.redo"
      >
        ↷ 重做
      </button>
      <button
        class="btn"
        @click="store.connected ? store.disconnect() : store.connect()"
      >
        {{ store.connected ? '断开' : '连接' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.colors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 400px;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.swatch:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.color-picker {
  width: 42px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
