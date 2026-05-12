<template>
  <div class="cloth-simulation">
    <div ref="containerRef" class="canvas-container"></div>
    <div class="controls-panel">
      <h3 class="title">⚡ 布料模拟控制器</h3>
      <div class="control-group">
        <label>
          风力强度: {{ windStrength.toFixed(1) }}
        </label>
        <input
          type="range"
          v-model.number="windStrength"
          min="0"
          max="15"
          step="0.1"
          @input="updateWind"
        />
      </div>
      <div class="control-group">
        <label>
          风速频率: {{ windFrequency.toFixed(1) }}
        </label>
        <input
          type="range"
          v-model.number="windFrequency"
          min="0.1"
          max="5"
          step="0.1"
          @input="updateWind"
        />
      </div>
      <div class="info">
        <p>🖱️ 鼠标拖拽旋转视角</p>
        <p>🔍 滚轮缩放</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ClothPhysics } from '../physics/ClothPhysics.js';
import { SceneRenderer } from '../renderer/SceneRenderer.js';

const containerRef = ref(null);
const windStrength = ref(5);
const windFrequency = ref(2);

let physics = null;
let renderer = null;

const updateWind = () => {
  if (physics) {
    physics.setWindStrength(windStrength.value);
    physics.setWindFrequency(windFrequency.value);
  }
};

onMounted(() => {
  physics = new ClothPhysics({
    width: 4,
    height: 3,
    segmentsX: 40,
    segmentsY: 30,
    windStrength: windStrength.value,
    windFrequency: windFrequency.value
  });

  renderer = new SceneRenderer(containerRef.value);
  renderer.start(physics);
});

onUnmounted(() => {
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.cloth-simulation {
  width: 100%;
  height: 100%;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.controls-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(10, 10, 30, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 12px;
  padding: 20px;
  min-width: 260px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.title {
  color: #fff;
  font-size: 16px;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(100, 150, 255, 0.3);
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  color: #a0b0ff;
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: 500;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, #4a90d9, #8b5cf6);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.control-group input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.info {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(100, 150, 255, 0.3);
}

.info p {
  color: #8898c8;
  font-size: 12px;
  margin: 6px 0;
  line-height: 1.5;
}
</style>
