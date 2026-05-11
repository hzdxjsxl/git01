<template>
  <div class="monitor-container">
    <div class="header">
      <h2>冷链疫苗运输车温度监控</h2>
      <div class="stats">
        <span class="stat-item" :class="{ active: anomalyCount > 0 }">
          异常车辆: {{ anomalyCount }}
        </span>
        <span class="stat-item">监控车辆: {{ vehicleData.length }}</span>
      </div>
    </div>

    <div class="vehicle-selector">
      <button
        v-for="v in vehicleData"
        :key="v.vehicleId"
        @click="selectedVehicle = v.vehicleId"
        :class="{ active: selectedVehicle === v.vehicleId }"
      >
        {{ v.vehicleId }}
        <span v-if="v.anomalies.length > 0" class="badge-warning">
          {{ v.anomalies.length }}
        </span>
      </button>
    </div>

    <div ref="chartRef" class="chart"></div>

    <div class="anomaly-list" v-if="currentAnomalies.length > 0">
      <h3>温度异常记录</h3>
      <div
        v-for="(seg, idx) in currentAnomalies"
        :key="idx"
        class="anomaly-item"
      >
        <div class="anomaly-time">
          {{ formatDateTime(seg.startTime) }} - {{ formatDateTime(seg.endTime) }}
        </div>
        <div class="anomaly-info">
          <span>持续 {{ seg.durationMinutes }} 分钟</span>
          <span class="max-temp">最高 {{ seg.maxTemperature.toFixed(1) }}°C</span>
        </div>
      </div>
    </div>

    <div class="loading" v-if="loading">加载中...</div>
    <div class="error" v-if="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import {
  analyzeTemperatureData,
  VehicleData,
  formatDateTime
} from '../utils/TemperatureAnalyzer';

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const vehicleData = ref<VehicleData[]>([]);
const selectedVehicle = ref<string>('');
const loading = ref(false);
const error = ref<string>('');

const anomalyCount = computed(() =>
  vehicleData.value.filter(v => v.anomalies.length > 0).length
);

const currentVehicleData = computed(() =>
  vehicleData.value.find(v => v.vehicleId === selectedVehicle.value)
);

const currentAnomalies = computed(() =>
  currentVehicleData.value?.anomalies || []
);

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('http://localhost:3000/api/temperature/24h');
    const json = await res.json();
    vehicleData.value = analyzeTemperatureData(json.data);
    if (vehicleData.value.length > 0 && !selectedVehicle.value) {
      selectedVehicle.value = vehicleData.value[0].vehicleId;
    }
  } catch (e) {
    error.value = '数据加载失败，请检查后端服务';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function renderChart() {
  if (!chartRef.value || !currentVehicleData.value) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
    window.addEventListener('resize', () => chartInstance?.resize());
  }

  const data = currentVehicleData.value;
  const points = data.points;

  const xAxisData = points.map(p => formatDateTime(p.timestamp));
  const seriesData = points.map(p => p.temperature);

  const markAreas: any[] = data.anomalies.map(seg => {
    const startIdx = points.findIndex(p => p.timestamp >= seg.startTime);
    const endIdx = points.findIndex(p => p.timestamp >= seg.endTime);
    const start = startIdx >= 0 ? startIdx : 0;
    const end = endIdx >= 0 ? endIdx : points.length - 1;
    return [
      { xAxis: start, itemStyle: { color: 'rgba(239, 68, 68, 0.3)' } },
      { xAxis: end }
    ];
  });

  const option: echarts.EChartsOption = {
    title: {
      text: `车辆 ${data.vehicleId} 温度趋势 (过去24小时)`,
      left: 'center',
      textStyle: { fontSize: 16, color: '#333' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>温度: ${p.value.toFixed(1)}°C`;
      }
    },
    grid: {
      left: 50,
      right: 30,
      bottom: 60,
      top: 60
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        rotate: 45,
        interval: Math.floor(xAxisData.length / 8)
      }
    },
    yAxis: {
      type: 'value',
      name: '温度 (°C)',
      min: 0,
      max: 15,
      splitLine: { show: true }
    },
    visualMap: {
      show: false,
      pieces: [
        { gt: 8, color: '#ef4444' },
        { lte: 8, color: '#22c55e' }
      ],
      dimension: 1
    },
    series: [
      {
        name: '温度',
        type: 'line',
        data: seriesData,
        smooth: true,
        lineStyle: { width: 2 },
        symbol: 'none',
        markLine: {
          silent: true,
          data: [
            {
              yAxis: 8,
              lineStyle: { color: '#ef4444', type: 'dashed' },
              label: { formatter: '阈值 8°C', position: 'end' }
            }
          ]
        },
        markArea: {
          silent: true,
          data: markAreas
        }
      }
    ]
  };

  chartInstance.setOption(option, true);
}

watch(selectedVehicle, () => renderChart());

onMounted(async () => {
  await fetchData();
  setTimeout(renderChart, 100);
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style scoped>
.monitor-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #1f2937;
}

.stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  padding: 8px 16px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
}

.stat-item.active {
  background: #fef2f2;
  color: #dc2626;
  font-weight: 600;
}

.vehicle-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.vehicle-selector button {
  padding: 10px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-selector button:hover {
  border-color: #3b82f6;
}

.vehicle-selector button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.badge-warning {
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.chart {
  width: 100%;
  height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.anomaly-list {
  margin-top: 24px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.anomaly-list h3 {
  margin: 0 0 16px 0;
  color: #dc2626;
  font-size: 16px;
}

.anomaly-item {
  padding: 12px;
  background: #fef2f2;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid #ef4444;
}

.anomaly-time {
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 4px;
}

.anomaly-info {
  display: flex;
  gap: 20px;
  color: #6b7280;
  font-size: 14px;
}

.max-temp {
  color: #dc2626;
  font-weight: 600;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.error {
  color: #dc2626;
}
</style>
