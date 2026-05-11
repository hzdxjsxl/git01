<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import ScatterPlot from './ScatterPlot.vue'
import { processLogData, getStatusCodeColor } from '../utils/logParser'
import type { ParsedLogEntry, LogStatistics } from '../utils/logParser'

interface LogFile {
  name: string
  size_bytes: number
}

interface LogContent {
  filename: string
  lines: string[]
  total_lines: number
}

const logFiles = ref<LogFile[]>([])
const selectedFile = ref<string>('')
const isLoading = ref(false)
const error = ref<string>('')
const refreshInterval = ref<number | null>(null)
const autoRefresh = ref(false)
const lineLimit = ref<number | null>(null)

// 非响应式变量，避免Vue深度追踪大数据

const statistics = ref<LogStatistics>({
  totalRequests: 0,
  validRequests: 0,
  p99Latency: 0,
  p95Latency: 0,
  p50Latency: 0,
  avgLatency: 0,
  maxLatency: 0,
  minLatency: 0,
  statusCodeDistribution: {},
  topIPs: []
})

const chartEntries = ref<ParsedLogEntry[]>([])

const validRate = ref(0)

async function fetchLogFiles() {
  try {
    const response = await fetch('/api/logs')
    if (response.ok) {
      logFiles.value = await response.json()
      if (logFiles.value.length > 0 && !selectedFile.value) {
        selectedFile.value = logFiles.value[0].name
      }
    }
  } catch (e) {
    error.value = '无法连接到后端服务'
  }
}

function processData(lines: string[]) {
  console.time('processLogData')
  
  const result = processLogData(lines)
  
  statistics.value = result.stats
  chartEntries.value = markRaw(result.entries)
  
  validRate.value = result.stats.totalRequests > 0 
    ? (result.stats.validRequests / result.stats.totalRequests) * 100 
    : 0
  
  console.timeEnd('processLogData')
  console.log(`Processed ${result.stats.totalRequests} entries, valid: ${result.stats.validRequests}`)
}

async function fetchLogContent() {
  if (!selectedFile.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const url = lineLimit.value
      ? `/api/logs/${selectedFile.value}?limit=${lineLimit.value}`
      : `/api/logs/${selectedFile.value}`
    
    const response = await fetch(url)
    if (response.ok) {
      const data: LogContent = await response.json()
      processData(data.lines)
    } else {
      error.value = '读取日志文件失败'
    }
  } catch (e) {
    error.value = '网络错误'
  } finally {
    isLoading.value = false
  }
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    refreshInterval.value = window.setInterval(() => {
      fetchLogContent()
    }, 5000)
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}

function refresh() {
  fetchLogContent()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatLatency(seconds: number): string {
  if (seconds < 1) return (seconds * 1000).toFixed(1) + ' ms'
  return seconds.toFixed(3) + ' s'
}

onMounted(async () => {
  await fetchLogFiles()
  if (selectedFile.value) {
    await fetchLogContent()
  }
})
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="title">Nginx 日志分析大盘</h1>
        <p class="subtitle">实时监控与性能分析</p>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="control-panel">
        <div class="control-group">
          <label>日志文件：</label>
          <select v-model="selectedFile" @change="fetchLogContent" class="select">
            <option v-for="file in logFiles" :key="file.name" :value="file.name">
              {{ file.name }} ({{ formatBytes(file.size_bytes) }})
            </option>
          </select>
        </div>
        
        <div class="control-group">
          <label>读取行数：</label>
          <select v-model="lineLimit" @change="fetchLogContent" class="select">
            <option :value="null">全部</option>
            <option :value="100">最近 100 行</option>
            <option :value="500">最近 500 行</option>
            <option :value="1000">最近 1000 行</option>
            <option :value="5000">最近 5000 行</option>
            <option :value="10000">最近 10000 行</option>
          </select>
        </div>

        <div class="control-group">
          <button @click="refresh" :disabled="isLoading" class="btn btn-primary">
            {{ isLoading ? '加载中...' : '刷新' }}
          </button>
        </div>

        <div class="control-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="toggle-text">自动刷新 (5秒)</span>
          </label>
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-if="statistics.totalRequests > 0" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总请求数</div>
          <div class="stat-value">{{ statistics.totalRequests.toLocaleString() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">解析成功率</div>
          <div class="stat-value">{{ validRate.toFixed(1) }}%</div>
        </div>
        <div class="stat-card stat-card-p99">
          <div class="stat-label">P99 延迟</div>
          <div class="stat-value">{{ formatLatency(statistics.p99Latency) }}</div>
        </div>
        <div class="stat-card stat-card-p95">
          <div class="stat-label">P95 延迟</div>
          <div class="stat-value">{{ formatLatency(statistics.p95Latency) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">P50 延迟</div>
          <div class="stat-value">{{ formatLatency(statistics.p50Latency) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均延迟</div>
          <div class="stat-value">{{ formatLatency(statistics.avgLatency) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">最大延迟</div>
          <div class="stat-value stat-danger">{{ formatLatency(statistics.maxLatency) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">最小延迟</div>
          <div class="stat-value stat-success">{{ formatLatency(statistics.minLatency) }}</div>
        </div>
      </div>

      <div v-if="statistics.totalRequests > 0" class="content-grid">
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">请求延迟散点图</h3>
            <div class="card-subtitle">X轴: 请求序号 | Y轴: 响应时间</div>
          </div>
          <div class="card-body">
            <ScatterPlot :entries="chartEntries" :statistics="statistics" />
          </div>
        </div>

        <div class="side-cards">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">状态码分布</h3>
            </div>
            <div class="card-body status-list">
              <div 
                v-for="(count, statusCode) in statistics.statusCodeDistribution" 
                :key="statusCode"
                class="status-item"
              >
                <span 
                  class="status-badge"
                  :style="{ backgroundColor: getStatusCodeColor(Number(statusCode)) }"
                >
                  {{ statusCode }}
                </span>
                <span class="status-count">{{ count }} 次</span>
                <div class="status-bar">
                  <div 
                    class="status-bar-fill"
                    :style="{ 
                      width: (count / statistics.validRequests * 100) + '%',
                      backgroundColor: getStatusCodeColor(Number(statusCode))
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Top IP 访问</h3>
            </div>
            <div class="card-body">
              <div 
                v-for="(item, index) in statistics.topIPs" 
                :key="item.ip"
                class="ip-item"
              >
                <span class="ip-rank">{{ index + 1 }}</span>
                <span class="ip-address">{{ item.ip }}</span>
                <span class="ip-count">{{ item.count }} 次</span>
              </div>
              <div v-if="statistics.topIPs.length === 0" class="empty-state">
                暂无数据
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="statistics.totalRequests === 0 && !isLoading && !error" class="empty-state-large">
        <div class="empty-icon">📊</div>
        <div class="empty-text">选择日志文件开始分析</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.dashboard-header {
  background: rgba(30, 41, 59, 0.9);
  border-bottom: 1px solid rgba(71, 85, 105, 0.5);
  padding: 24px 32px;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
}

.title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.dashboard-main {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 32px;
}

.control-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(71, 85, 105, 0.3);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.select {
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
  min-width: 160px;
}

.select:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label input {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.toggle-text {
  font-size: 13px;
  color: #94a3b8;
}

.error-message {
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s, border-color 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.5);
}

.stat-card-p99 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%);
  border-color: rgba(239, 68, 68, 0.4);
}

.stat-card-p95 {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%);
  border-color: rgba(245, 158, 11, 0.4);
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
}

.stat-danger {
  color: #f87171;
}

.stat-success {
  color: #4ade80;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.chart-card {
  grid-row: span 2;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.card-subtitle {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.card-body {
  padding: 20px;
}

.side-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.status-count {
  font-size: 13px;
  color: #e2e8f0;
  min-width: 60px;
}

.status-bar {
  flex: 1;
  height: 8px;
  background: rgba(71, 85, 105, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.ip-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(71, 85, 105, 0.2);
}

.ip-item:last-child {
  border-bottom: none;
}

.ip-rank {
  width: 24px;
  height: 24px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #3b82f6;
  margin-right: 12px;
}

.ip-address {
  flex: 1;
  font-size: 13px;
  color: #e2e8f0;
  font-family: 'Courier New', monospace;
}

.ip-count {
  font-size: 12px;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #64748b;
  font-size: 14px;
}

.empty-state-large {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .side-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}
</style>
