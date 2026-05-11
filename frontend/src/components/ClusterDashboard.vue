<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import wsService from '@/services/WebSocketService'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const isConnected = ref(false)
const selectedNodeId = ref(null)
const dataReady = ref(false)

const dashboardData = reactive({
  nodes: [],
  overall: {
    avgCpu: 0,
    avgMemory: 0,
    nodesOnline: 0
  }
})

const nodeColors = [
  { cpu: { border: '#4FC3F7', bg: 'rgba(79, 195, 247, 0.1)' }, mem: { border: '#81C784', bg: 'rgba(129, 199, 132, 0.1)' } },
  { cpu: { border: '#BA68C8', bg: 'rgba(186, 104, 200, 0.1)' }, mem: { border: '#FFB74D', bg: 'rgba(255, 183, 77, 0.1)' } },
  { cpu: { border: '#F06292', bg: 'rgba(240, 98, 146, 0.1)' }, mem: { border: '#4DB6AC', bg: 'rgba(77, 182, 172, 0.1)' } },
  { cpu: { border: '#FF8A65', bg: 'rgba(255, 138, 101, 0.1)' }, mem: { border: '#A1887F', bg: 'rgba(161, 136, 127, 0.1)' } },
  { cpu: { border: '#9575CD', bg: 'rgba(149, 117, 205, 0.1)' }, mem: { border: '#4DD0E1', bg: 'rgba(77, 208, 225, 0.1)' } }
]

const selectedNode = computed(() => {
  return dashboardData.nodes.find(n => n.nodeId === selectedNodeId.value) || null
})

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 300
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        maxTicksLimit: 10
      }
    },
    y: {
      min: 0,
      max: 100,
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.6)',
        callback: (value) => value + '%'
      }
    }
  },
  plugins: {
    legend: {
      display: true,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        usePointStyle: true
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}

const cpuChartData = computed(() => {
  if (!selectedNode.value) return { labels: [], datasets: [] }

  const labels = selectedNode.value.trendData.map(d => d.time)
  const values = selectedNode.value.trendData.map(d => d.cpu)

  return {
    labels,
    datasets: [{
      label: 'CPU 使用率 (%)',
      data: values,
      borderColor: '#4FC3F7',
      backgroundColor: 'rgba(79, 195, 247, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2
    }]
  }
})

const memoryChartData = computed(() => {
  if (!selectedNode.value) return { labels: [], datasets: [] }

  const labels = selectedNode.value.trendData.map(d => d.time)
  const values = selectedNode.value.trendData.map(d => d.memory)

  return {
    labels,
    datasets: [{
      label: '内存使用率 (%)',
      data: values,
      borderColor: '#81C784',
      backgroundColor: 'rgba(129, 199, 132, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2
    }]
  }
})

const clusterCpuChartData = computed(() => {
  const labels = dashboardData.nodes.length > 0
    ? dashboardData.nodes[0].trendData.map(d => d.time)
    : []

  const datasets = dashboardData.nodes.map((node, index) => {
    const color = nodeColors[index % nodeColors.length]
    return {
      label: node.nodeId,
      data: node.trendData.map(d => d.cpu),
      borderColor: color.cpu.border,
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5
    }
  })

  return { labels, datasets }
})

const clusterMemoryChartData = computed(() => {
  const labels = dashboardData.nodes.length > 0
    ? dashboardData.nodes[0].trendData.map(d => d.time)
    : []

  const datasets = dashboardData.nodes.map((node, index) => {
    const color = nodeColors[index % nodeColors.length]
    return {
      label: node.nodeId,
      data: node.trendData.map(d => d.memory),
      borderColor: color.mem.border,
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5
    }
  })

  return { labels, datasets }
})

const handleDataUpdate = (data) => {
  dashboardData.nodes = data.nodes
  dashboardData.overall = data.overall
  dataReady.value = true

  if (!selectedNodeId.value && data.nodes.length > 0) {
    selectedNodeId.value = data.nodes[0].nodeId
  }
}

const handleConnectChange = ({ connected }) => {
  isConnected.value = connected
}

const getSeverityClass = (value) => {
  if (value >= 80) return 'high'
  if (value >= 60) return 'medium'
  return 'normal'
}

const selectNode = (nodeId) => {
  selectedNodeId.value = nodeId
}

onMounted(() => {
  wsService.on('data', handleDataUpdate)
  wsService.on('connect', handleConnectChange)
  wsService.connect()
})

onUnmounted(() => {
  wsService.off('data', handleDataUpdate)
  wsService.off('connect', handleConnectChange)
  wsService.disconnect()
})
</script>

<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-left">
        <h1 class="title">服务器集群监控大屏</h1>
        <span class="subtitle">实时监控 - 60秒滑动窗口</span>
      </div>
      <div class="header-right">
        <div class="connection-status" :class="{ connected: isConnected }">
          <span class="status-dot"></span>
          <span>{{ isConnected ? '已连接' : '连接中...' }}</span>
        </div>
        <div class="node-count">
          在线节点: <strong>{{ dashboardData.overall.nodesOnline }}</strong>
        </div>
      </div>
    </header>

    <div class="overall-stats">
      <div class="stat-card overall-cpu">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <rect x="6" y="8" width="4" height="4"></rect>
            <rect x="14" y="8" width="4" height="4"></rect>
            <rect x="6" y="14" width="12" height="4"></rect>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">集群平均 CPU</div>
          <div class="stat-value">{{ dashboardData.overall.avgCpu }}%</div>
        </div>
      </div>

      <div class="stat-card overall-memory">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M6 8h12M6 12h12M6 16h12"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">集群平均内存</div>
          <div class="stat-value">{{ dashboardData.overall.avgMemory }}%</div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="nodes-panel">
        <h2 class="panel-title">节点列表</h2>
        <div class="nodes-list">
          <div
            v-for="(node, index) in dashboardData.nodes"
            :key="node.nodeId"
            class="node-card"
            :class="{ selected: selectedNodeId === node.nodeId }"
            @click="selectNode(node.nodeId)"
          >
            <div class="node-header">
              <span class="node-id">{{ node.nodeId }}</span>
              <span class="node-indicator" :style="{ backgroundColor: nodeColors[index % nodeColors.length].cpu.border }"></span>
            </div>

            <div class="node-metrics">
              <div class="metric-row">
                <span class="metric-label">CPU</span>
                <div class="metric-bar-wrapper">
                  <div
                    class="metric-bar"
                    :class="getSeverityClass(node.currentCpu)"
                    :style="{ width: node.currentCpu + '%' }"
                  ></div>
                </div>
                <span class="metric-value">{{ node.currentCpu }}%</span>
              </div>

              <div class="metric-row">
                <span class="metric-label">内存</span>
                <div class="metric-bar-wrapper">
                  <div
                    class="metric-bar"
                    :class="getSeverityClass(node.currentMemory)"
                    :style="{ width: node.currentMemory + '%' }"
                  ></div>
                </div>
                <span class="metric-value">{{ node.currentMemory }}%</span>
              </div>
            </div>

            <div class="node-avg">
              <span>1分钟平均: CPU {{ node.avgCpu }}% / 内存 {{ node.avgMemory }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-panel">
        <div class="charts-section" v-if="selectedNode">
          <h2 class="panel-title">{{ selectedNode.nodeId }} - 实时趋势</h2>
          <div class="chart-row">
            <div class="chart-container">
              <Line :data="cpuChartData" :options="commonChartOptions" />
            </div>
            <div class="chart-container">
              <Line :data="memoryChartData" :options="commonChartOptions" />
            </div>
          </div>
        </div>

        <div class="charts-section">
          <h2 class="panel-title">集群对比 - CPU</h2>
          <div class="chart-container large">
            <Line :data="clusterCpuChartData" :options="commonChartOptions" />
          </div>
        </div>

        <div class="charts-section">
          <h2 class="panel-title">集群对比 - 内存</h2>
          <div class="chart-container large">
            <Line :data="clusterMemoryChartData" :options="commonChartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #4FC3F7, #81C784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(244, 67, 54, 0.15);
  border-radius: 20px;
  color: #EF5350;
}

.connection-status.connected {
  background: rgba(129, 199, 132, 0.15);
  color: #81C784;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.node-count {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.node-count strong {
  color: #4FC3F7;
  font-size: 20px;
}

.overall-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 30px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  padding: 12px;
  border-radius: 12px;
}

.overall-cpu .stat-icon {
  background: rgba(79, 195, 247, 0.15);
  color: #4FC3F7;
}

.overall-memory .stat-icon {
  background: rgba(129, 199, 132, 0.15);
  color: #81C784;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
}

.nodes-panel,
.charts-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: rgba(255, 255, 255, 0.9);
}

.nodes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 380px);
  overflow-y: auto;
  padding-right: 8px;
}

.nodes-list::-webkit-scrollbar {
  width: 6px;
}

.nodes-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.nodes-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.node-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.node-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.node-card.selected {
  border-color: rgba(79, 195, 247, 0.5);
  background: rgba(79, 195, 247, 0.08);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.node-id {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.node-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.node-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-label {
  width: 40px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.metric-bar-wrapper {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.metric-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-bar.normal {
  background: linear-gradient(90deg, #81C784, #A5D6A7);
}

.metric-bar.medium {
  background: linear-gradient(90deg, #FFB74D, #FFCC80);
}

.metric-bar.high {
  background: linear-gradient(90deg, #EF5350, #EF9A9A);
}

.metric-value {
  width: 55px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.node-avg {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.charts-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-container {
  height: 280px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.chart-container.large {
  height: 320px;
}
</style>