<template>
  <div class="app-container">
    <header class="app-header">
      <h1>用户行为路径分析系统</h1>
      <div class="header-info">
        <span>High-interaction User Behavior Path Analysis</span>
      </div>
    </header>

    <div class="control-panel">
      <div class="control-group">
        <label>每页加载数量:</label>
        <select v-model="config.pageSize" :disabled="isLoading">
          <option :value="500">500</option>
          <option :value="1000">1000</option>
          <option :value="2000">2000</option>
          <option :value="5000">5000</option>
        </select>
      </div>

      <div class="control-group">
        <label>加载页数:</label>
        <select v-model="config.maxPages" :disabled="isLoading">
          <option :value="1">1 页</option>
          <option :value="5">5 页</option>
          <option :value="10">10 页</option>
          <option :value="50">50 页</option>
          <option :value="100">100 页</option>
        </select>
      </div>

      <div class="control-group">
        <label>最大路径深度:</label>
        <select v-model="config.maxSteps" :disabled="isLoading">
          <option :value="5">5 步</option>
          <option :value="10">10 步</option>
          <option :value="15">15 步</option>
          <option :value="20">20 步</option>
        </select>
      </div>

      <div class="control-group">
        <label>起始页面:</label>
        <select v-model="config.startPage" :disabled="isLoading">
          <option value="">全部</option>
          <option value="/home">首页</option>
          <option value="/products">产品中心</option>
          <option value="/search">搜索</option>
        </select>
      </div>

      <div class="action-buttons">
        <button 
          @click="loadData" 
          :disabled="isLoading"
          class="btn btn-primary"
        >
          {{ isLoading ? '加载中...' : '开始分析' }}
        </button>
        <button 
          @click="stopLoading" 
          :disabled="!isLoading"
          class="btn btn-danger"
        >
          停止
        </button>
        <button 
          @click="resetData" 
          :disabled="isLoading"
          class="btn btn-secondary"
        >
          重置
        </button>
      </div>
    </div>

    <div class="progress-panel" v-if="isLoading || stats.totalRecords > 0">
      <div class="progress-info">
        <span>已加载: {{ stats.totalRecords.toLocaleString() }} 条记录</span>
        <span>Session数: {{ stats.totalSessions.toLocaleString() }}</span>
        <span>唯一页面: {{ stats.uniquePages }}</span>
        <span v-if="isLoading">当前进度: {{ currentPage }} / {{ config.maxPages }} 页</span>
      </div>
      <div class="progress-bar" v-if="isLoading">
        <div 
          class="progress-fill" 
          :style="{ width: `${(currentPage / config.maxPages) * 100}%` }"
        ></div>
      </div>
    </div>

    <div class="error-message" v-if="errorMessage">
      {{ errorMessage }}
    </div>

    <div class="chart-container" v-if="graphData.nodes.length > 0">
      <SankeyChart 
        :graphData="graphData" 
        :width="1200" 
        :height="600" 
      />
    </div>

    <div class="empty-state" v-else-if="!isLoading">
      <div class="empty-icon">📊</div>
      <h3>点击"开始分析"加载用户行为数据</h3>
      <p>系统将从后端分页拉取原始点击流水，在前端进行聚合分析</p>
    </div>

    <div class="loading-spinner" v-if="isLoading">
      <div class="spinner"></div>
      <p>正在处理数据，请勿关闭页面...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, computed } from 'vue';
import SankeyChart from './components/SankeyChart.vue';
import { SankeyGraphBuilder, createSankeyGraphBuilder } from './utils/SankeyGraphBuilder';
import { fetchAllClickStream, fetchStats } from './services/api';
import type { GraphResult, ClickRecord } from './utils/SankeyGraphBuilder';

interface Config {
  pageSize: number;
  maxPages: number;
  maxSteps: number;
  startPage: string;
}

const config = reactive<Config>({
  pageSize: 1000,
  maxPages: 10,
  maxSteps: 10,
  startPage: ''
});

const isLoading = ref(false);
const currentPage = ref(0);
const errorMessage = ref('');
let abortController: AbortController | null = null;

const graphBuilder = ref<SankeyGraphBuilder | null>(null);

const graphData = ref<GraphResult>({
  nodes: [],
  links: [],
  totalSessions: 0,
  totalRecords: 0
});

const stats = computed(() => {
  if (graphBuilder.value) {
    return graphBuilder.value.getStats();
  }
  return { totalRecords: 0, totalSessions: 0, uniquePages: 0 };
});

async function loadData() {
  errorMessage.value = '';
  isLoading.value = true;
  currentPage.value = 0;

  graphBuilder.value = createSankeyGraphBuilder({
    maxSteps: config.maxSteps,
    startPage: config.startPage || undefined
  });

  abortController = new AbortController();

  try {
    await fetchStats();

    for await (const records of fetchAllClickStream(config.pageSize, {
      maxPages: config.maxPages
    })) {
      if (abortController?.signal.aborted) {
        break;
      }

      currentPage.value++;
      graphBuilder.value?.addRecords(records as ClickRecord[]);
      updateGraph();

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    errorMessage.value = error instanceof Error ? error.message : '加载数据失败';
  } finally {
    isLoading.value = false;
    abortController = null;
  }
}

function stopLoading() {
  if (abortController) {
    abortController.abort();
  }
}

function resetData() {
  graphBuilder.value?.clear();
  graphData.value = {
    nodes: [],
    links: [],
    totalSessions: 0,
    totalRecords: 0
  };
  currentPage.value = 0;
  errorMessage.value = '';
}

function updateGraph() {
  if (!graphBuilder.value) return;

  const result = graphBuilder.value.buildGraph();
  graphData.value = result;
}

onUnmounted(() => {
  stopLoading();
});
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 20px;
  box-sizing: border-box;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-info {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 5px;
}

.control-panel {
  background: white;
  padding: 20px 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 30px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.control-group select {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 120px;
}

.control-group select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f2f5;
  color: #666;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.progress-panel {
  background: white;
  padding: 16px 30px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.progress-info {
  display: flex;
  gap: 30px;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 16px 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
}

.chart-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #666;
}

.empty-state p {
  font-size: 14px;
}

.loading-spinner {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: white;
  padding: 20px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1000;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  margin: 0;
  font-size: 14px;
  color: #666;
}
</style>
