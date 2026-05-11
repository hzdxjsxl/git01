<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { TariffCalculator } from '../lib/TariffCalculator';
  import type { BillingRecord, TariffPeriod, TariffConfig } from '../lib/TariffCalculator';

  let calculator: TariffCalculator;
  let eventSource: EventSource | null = null;
  let isConnected = false;
  let isPaused = false;

  let currentPower: number = 0;
  let totalEnergy: number = 0;
  let totalCost: number = 0;

  let peakEnergy: number = 0;
  let valleyEnergy: number = 0;
  let flatEnergy: number = 0;

  let peakCost: number = 0;
  let valleyCost: number = 0;
  let flatCost: number = 0;

  let currentPeriod: TariffPeriod = 'flat';
  let currentRate: number = 0;
  let currentDescription: string = '';

  let chartData: BillingRecord[] = [];
  let recentRecords: BillingRecord[] = [];

  let tariffConfig: TariffConfig | null = null;
  let maxChartPower: number = 1;

  const MAX_CHART_POINTS = 60;

  onMount(() => {
    calculator = new TariffCalculator();
    tariffConfig = calculator.getConfig();
    updatePeriodInfo();
    connectStream();

    const periodInterval = setInterval(() => {
      updatePeriodInfo();
    }, 60000);

    onDestroy(() => {
      clearInterval(periodInterval);
      disconnectStream();
    });
  });

  function connectStream() {
    if (eventSource) return;

    eventSource = new EventSource('/api/meter/stream');

    eventSource.onopen = () => {
      isConnected = true;
    };

    eventSource.onmessage = (event) => {
      if (isPaused) return;

      try {
        const data = JSON.parse(event.data);
        handleReading(data);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      isConnected = false;
      setTimeout(() => {
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          eventSource = null;
          connectStream();
        }
      }, 5000);
    };
  }

  function disconnectStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    isConnected = false;
  }

  function handleReading(reading: { timestamp: number; powerWatts: number; meterId: string }) {
    currentPower = reading.powerWatts;

    const records = calculator.processReading(reading);

    if (records.length > 0) {
      updateStats();
      for (const record of records) {
        addToChart(record);
      }
    }
  }

  function updateStats() {
    totalEnergy = calculator.getTotalEnergyKwh();
    totalCost = calculator.getTotalCost();

    peakEnergy = calculator.getPeakEnergy();
    valleyEnergy = calculator.getValleyEnergy();
    flatEnergy = calculator.getFlatEnergy();

    peakCost = calculator.getPeakCost();
    valleyCost = calculator.getValleyCost();
    flatCost = calculator.getFlatCost();

    recentRecords = calculator.getRecentRecords(10).reverse();
  }

  function addToChart(record: BillingRecord) {
    chartData.push(record);

    if (chartData.length > MAX_CHART_POINTS) {
      chartData = chartData.slice(-MAX_CHART_POINTS);
    }

    maxChartPower = Math.max(...chartData.map(r => r.powerWatts), 1);
  }

  function updatePeriodInfo() {
    if (!calculator) return;

    const info = calculator.getCurrentPeriodInfo();
    currentPeriod = info.period;
    currentRate = info.rate;
    currentDescription = info.description;
  }

  function togglePause() {
    isPaused = !isPaused;
  }

  function resetData() {
    calculator.reset();
    chartData = [];
    totalEnergy = 0;
    totalCost = 0;
    peakEnergy = 0;
    valleyEnergy = 0;
    flatEnergy = 0;
    peakCost = 0;
    valleyCost = 0;
    flatCost = 0;
    recentRecords = [];
    maxChartPower = 1;
  }

  function formatCurrency(amount: number): string {
    return calculator ? calculator.formatCurrency(amount) : `¥${amount.toFixed(2)}`;
  }

  function formatEnergy(kwh: number): string {
    return calculator ? calculator.formatEnergy(kwh) : `${kwh.toFixed(2)} kWh`;
  }

  function formatPower(watts: number): string {
    return calculator ? calculator.formatPower(watts) : `${watts.toFixed(0)} W`;
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getBarHeight(power: number): string {
    const height = (power / maxChartPower) * 100;
    return `${Math.max(height, 2)}%`;
  }

  $: totalByPeriod = {
    peak: peakEnergy,
    valley: valleyEnergy,
    flat: flatEnergy
  };
</script>

<div class="dashboard">
  <header class="header">
    <h1>智能工厂能耗计费系统</h1>
    <p class="subtitle">实时电表数据监控与峰谷平阶梯电价计费</p>

    <div class="status-bar">
      <div class="status-item">
        <div class="status-dot" class:disconnected={!isConnected}></div>
        <span>{isConnected ? '已连接' : '未连接'}</span>
      </div>
      <div class="status-item">
        <span>当前时段:</span>
        <span class="period-indicator {currentPeriod}">
          {currentDescription}
        </span>
      </div>
      <div class="status-item">
        <span>电价:</span>
        <span>¥{currentRate.toFixed(2)}/kWh</span>
      </div>
    </div>
  </header>

  <div class="controls">
    <button class="btn btn-secondary" on:click={togglePause}>
      {isPaused ? '继续' : '暂停'}
    </button>
    <button class="btn btn-secondary" on:click={resetData}>
      重置数据
    </button>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">实时功率</div>
      <div class="card-value">{formatPower(currentPower)}</div>
      <div class="card-unit">当前用电负荷</div>
    </div>

    <div class="card">
      <div class="card-title">累计用电量</div>
      <div class="card-value">{formatEnergy(totalEnergy)}</div>
      <div class="card-unit">本次会话累计</div>
    </div>

    <div class="card">
      <div class="card-title">累计费用</div>
      <div class="card-value currency">{formatCurrency(totalCost)}</div>
      <div class="card-unit">实时计费累加</div>
    </div>
  </div>

  <div class="grid">
    <div class="card peak">
      <div class="card-title">尖峰时段用电</div>
      <div class="card-value">{formatEnergy(peakEnergy)}</div>
      <div class="card-unit">费用: {formatCurrency(peakCost)}</div>
    </div>

    <div class="card valley">
      <div class="card-title">谷段时段用电</div>
      <div class="card-value">{formatEnergy(valleyEnergy)}</div>
      <div class="card-unit">费用: {formatCurrency(valleyCost)}</div>
    </div>

    <div class="card flat">
      <div class="card-title">平段时段用电</div>
      <div class="card-value">{formatEnergy(flatEnergy)}</div>
      <div class="card-unit">费用: {formatCurrency(flatCost)}</div>
    </div>
  </div>

  <div class="chart-section">
    <div class="chart-header">
      <h2 class="chart-title">实时功率曲线</h2>
      <div class="period-indicator {currentPeriod}">
        {currentDescription}
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-y-axis">
        <span>{formatPower(maxChartPower)}</span>
        <span>{formatPower(maxChartPower * 0.75)}</span>
        <span>{formatPower(maxChartPower * 0.5)}</span>
        <span>{formatPower(maxChartPower * 0.25)}</span>
        <span>0 W</span>
      </div>

      <div class="chart">
        {#each chartData as record}
          <div
            class="bar {record.period}"
            style="height: {getBarHeight(record.powerWatts)}"
            title={`${formatTime(record.timestamp)} - ${formatPower(record.powerWatts)}`}
          ></div>
        {:else}
          <div class="bar flat" style="height: 2%; opacity: 0.3;"></div>
        {/each}
      </div>
    </div>

    <div class="legend">
      <div class="legend-item">
        <div class="legend-color peak"></div>
        <span>尖峰 (¥{tariffConfig?.rates.find(r => r.period === 'peak')?.pricePerKwh.toFixed(2)}/kWh)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color flat"></div>
        <span>平段 (¥{tariffConfig?.rates.find(r => r.period === 'flat')?.pricePerKwh.toFixed(2)}/kWh)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color valley"></div>
        <span>谷段 (¥{tariffConfig?.rates.find(r => r.period === 'valley')?.pricePerKwh.toFixed(2)}/kWh)</span>
      </div>
    </div>
  </div>

  <div class="tables-section">
    <div class="table-card">
      <h3>分时电价配置</h3>
      <table>
        <thead>
          <tr>
            <th>时段</th>
            <th>时间段</th>
            <th class="text-right">电价</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge peak">尖峰</span></td>
            <td>08:00-11:00, 14:00-15:00, 18:00-23:00</td>
            <td class="text-right">¥1.25/kWh</td>
          </tr>
          <tr>
            <td><span class="badge flat">平段</span></td>
            <td>11:00-14:00, 15:00-18:00</td>
            <td class="text-right">¥0.85/kWh</td>
          </tr>
          <tr>
            <td><span class="badge valley">谷段</span></td>
            <td>23:00-08:00</td>
            <td class="text-right">¥0.35/kWh</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-card">
      <h3>阶梯电价配置</h3>
      <table>
        <thead>
          <tr>
            <th>阶梯</th>
            <th>日用电量阈值</th>
            <th class="text-right">加价系数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>第一阶梯</td>
            <td>0 - 2,000 kWh</td>
            <td class="text-right">× 1.00</td>
          </tr>
          <tr>
            <td>第二阶梯</td>
            <td>2,000 - 5,000 kWh</td>
            <td class="text-right">× 1.10</td>
          </tr>
          <tr>
            <td>第三阶梯</td>
            <td>5,000 kWh 以上</td>
            <td class="text-right">× 1.25</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="table-card" style="margin-top: 20px;">
    <h3>最近计费记录</h3>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>功率</th>
          <th>用电量</th>
          <th>时段</th>
          <th>费率</th>
          <th class="text-right">费用</th>
        </tr>
      </thead>
      <tbody>
        {#if recentRecords.length > 0}
          {#each recentRecords as record}
            <tr>
              <td>{formatTime(record.timestamp)}</td>
              <td>{formatPower(record.powerWatts)}</td>
              <td>{(record.energyKwh * 1000).toFixed(2)} Wh</td>
              <td>
                <span class="badge {record.period}">
                  {record.period === 'peak' ? '尖峰' : record.period === 'valley' ? '谷段' : '平段'}
                </span>
              </td>
              <td>¥{record.rate.toFixed(2)}/kWh</td>
              <td class="text-right">{formatCurrency(record.cost)}</td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="6" style="text-align: center; color: #888;">等待数据...</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
