<script>
  import { onMount } from 'svelte'
  import { loadAllData } from './api.js'
  import { optimizeSchedule, calculateBaselineCost } from './optimizer.js'
  import GanttChart from './GanttChart.svelte'
  
  let loading = true
  let error = null
  let appliances = []
  let prices = null
  let optimizationResult = null
  let baselineCost = 0
  
  async function initialize() {
    try {
      const data = await loadAllData()
      appliances = data.appliances
      prices = data.prices
      
      optimizationResult = optimizeSchedule(appliances, prices)
      baselineCost = calculateBaselineCost(appliances, prices)
      
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }
  
  onMount(initialize)
  
  function formatMoney(value) {
    return `¥${value.toFixed(2)}`
  }
  
  function formatPower(value) {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)} kW`
    }
    return `${value} W`
  }
  
  function formatTime(hour) {
    return `${hour.toString().padStart(2, '0')}:00`
  }
</script>

<div class="app">
  <header class="header">
    <h1>智能家居电费峰谷优化计算大盘</h1>
    <p class="subtitle">基于动态规划算法，智能规划电器运行时段，最大程度节省电费</p>
  </header>
  
  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>正在加载数据并计算最优调度策略...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h2>加载失败</h2>
      <p>{error}</p>
      <button on:click={initialize}>重新加载</button>
    </div>
  {:else}
    <main class="main-content">
      <section class="stats-section">
        <div class="stat-card primary">
          <div class="stat-label">优化后总电费</div>
          <div class="stat-value">{formatMoney(optimizationResult.totalCost)}</div>
          <div class="stat-comparison">
            相比优化前节省 
            <span class="savings">{formatMoney(baselineCost - optimizationResult.totalCost)}</span>
            ({(((baselineCost - optimizationResult.totalCost) / baselineCost) * 100).toFixed(1)}%)
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">优化前预计电费</div>
          <div class="stat-value baseline">{formatMoney(baselineCost)}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">总耗电量</div>
          <div class="stat-value">{optimizationResult.totalPowerConsumption.toFixed(1)} kWh</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">峰值功率</div>
          <div class="stat-value">{formatPower(optimizationResult.peakPower)}</div>
        </div>
      </section>
      
      <section class="chart-section">
        <h2 class="section-title">最优电器调度甘特图</h2>
        <p class="section-desc">
          甘特图展示了每个电器的最优运行时段。背景颜色表示对应时段的电价水平，
          算法会自动将高耗能电器安排在电价较低的时段运行。
        </p>
        
        <GanttChart schedules={optimizationResult.schedules} {prices} />
      </section>
      
      <section class="details-section">
        <div class="appliances-list">
          <h2 class="section-title">电器运行详情</h2>
          <div class="table-container">
            <table class="appliances-table">
              <thead>
                <tr>
                  <th>电器名称</th>
                  <th>功率</th>
                  <th>运行时长</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>电费</th>
                </tr>
              </thead>
              <tbody>
                {#each optimizationResult.schedules as schedule}
                  <tr>
                    <td class="appliance-name">
                      <span class="name">{schedule.appliance.name}</span>
                      {#if schedule.appliance.usageWindow}
                        <span class="window-label">
                          可用时段: {formatTime(schedule.appliance.usageWindow[0])}-{formatTime(schedule.appliance.usageWindow[1] % 24)}
                        </span>
                      {/if}
                    </td>
                    <td>{formatPower(schedule.appliance.powerWatts)}</td>
                    <td>{schedule.durationHours} 小时</td>
                    <td>{formatTime(schedule.startHour)}</td>
                    <td>{formatTime(schedule.endHour)}</td>
                    <td class="cost-cell">{formatMoney(schedule.totalCost)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="price-info">
          <h2 class="section-title">24小时峰谷电价</h2>
          <div class="price-table-container">
            <table class="price-table">
              <thead>
                <tr>
                  <th>时段</th>
                  <th>时间</th>
                  <th>电价 (元/度)</th>
                </tr>
              </thead>
              <tbody>
                {#each prices.periods as period}
                  <tr class="price-row-{period.type}">
                    <td class="period-type">{period.type}</td>
                    <td>{period.time}</td>
                    <td class="price-value">{period.price.toFixed(2)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          
          <div class="algorithm-info">
            <h3>优化算法说明</h3>
            <p>
              本系统采用动态规划算法（类似背包问题思路）来求解最优电器调度策略。
              算法会在满足所有约束条件（如电器可用时段、运行时长）的前提下，
              寻找一个全局最优解，使得总电费最低。
            </p>
            <ul>
              <li>按功耗和时长对电器排序，优先安排高耗能电器</li>
              <li>考虑时间窗口约束，确保电器只在可用时段运行</li>
              <li>计算所有可能的运行时段，选择成本最低的组合</li>
              <li>避免电器运行时间冲突（可选功率限制）</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  {/if}
</div>

<style>
  * {
    box-sizing: border-box;
  }
  
  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    color: #e5e7eb;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }
  
  .header {
    text-align: center;
    padding: 40px 20px;
  }
  
  .header h1 {
    margin: 0 0 10px 0;
    font-size: 2.5rem;
    background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .subtitle {
    margin: 0;
    color: #9ca3af;
    font-size: 1.1rem;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #9ca3af;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #374151;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-container {
    max-width: 500px;
    margin: 100px auto;
    text-align: center;
    padding: 40px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .error-container button {
    margin-top: 20px;
    padding: 10px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .main-content {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .stats-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }
  
  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
  }
  
  .stat-card.primary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  .stat-label {
    font-size: 14px;
    color: #9ca3af;
    margin-bottom: 8px;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #f9fafb;
  }
  
  .stat-value.baseline {
    color: #9ca3af;
    text-decoration: line-through;
  }
  
  .stat-comparison {
    margin-top: 12px;
    font-size: 13px;
    color: #9ca3af;
  }
  
  .savings {
    color: #10b981;
    font-weight: 600;
  }
  
  .chart-section {
    margin-bottom: 40px;
  }
  
  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 10px;
    color: #f9fafb;
  }
  
  .section-desc {
    color: #9ca3af;
    margin-bottom: 20px;
    line-height: 1.6;
  }
  
  .details-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
  }
  
  @media (max-width: 1024px) {
    .details-section {
      grid-template-columns: 1fr;
    }
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .appliances-table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .appliances-table th,
  .appliances-table td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .appliances-table th {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: #d1d5db;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .appliance-name {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .appliance-name .name {
    font-weight: 500;
    color: #f9fafb;
  }
  
  .window-label {
    font-size: 11px;
    color: #6b7280;
  }
  
  .cost-cell {
    font-weight: 600;
    color: #60a5fa;
  }
  
  .price-table-container {
    margin-bottom: 30px;
  }
  
  .price-table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .price-table th,
  .price-table td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .price-table th {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: #d1d5db;
    font-size: 13px;
  }
  
  .period-type {
    font-weight: 500;
  }
  
  .price-row-谷时 .period-type {
    color: #4d96ff;
  }
  
  .price-row-平时 .period-type {
    color: #6bcb77;
  }
  
  .price-row-峰时 .period-type {
    color: #ffd93d;
  }
  
  .price-row-尖峰 .period-type {
    color: #ff6b6b;
  }
  
  .price-value {
    font-weight: 600;
    font-family: monospace;
  }
  
  .algorithm-info {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 24px;
  }
  
  .algorithm-info h3 {
    margin-top: 0;
    color: #f9fafb;
    font-size: 1.1rem;
  }
  
  .algorithm-info p {
    color: #9ca3af;
    line-height: 1.7;
    margin-bottom: 16px;
  }
  
  .algorithm-info ul {
    margin: 0;
    padding-left: 20px;
    color: #9ca3af;
    line-height: 1.8;
  }
  
  .algorithm-info li {
    margin-bottom: 6px;
  }
</style>
