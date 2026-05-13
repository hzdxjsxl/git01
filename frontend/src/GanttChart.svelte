<script>
  export let schedules
  export let prices
  
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16'
  ]
  
  $: sortedSchedules = schedules ? [...schedules].sort((a, b) => {
    if (a.appliance.durationHours === 24) return -1
    if (b.appliance.durationHours === 24) return 1
    return a.startHour - b.startHour
  }) : []
  
  function getBarPosition(schedule) {
    const { startHour, endHour, durationHours } = schedule
    
    if (durationHours === 24) {
      return { left: 0, width: 100 }
    }
    
    if (startHour < endHour) {
      return {
        left: (startHour / 24) * 100,
        width: (durationHours / 24) * 100
      }
    } else {
      return {
        left: (startHour / 24) * 100,
        width: ((24 - startHour) / 24) * 100
      }
    }
  }
  
  function getBarPosition2(schedule) {
    const { startHour, endHour, durationHours } = schedule
    
    if (startHour < endHour) {
      return null
    }
    
    return {
      left: 0,
      width: (endHour / 24) * 100
    }
  }
  
  function formatTime(hour) {
    return `${hour.toString().padStart(2, '0')}:00`
  }
  
  function getPriceColor(hour, hourlyPrices) {
    const price = hourlyPrices[hour]
    if (price >= 1.0) return '#FF6B6B'
    if (price >= 0.8) return '#FFD93D'
    if (price >= 0.5) return '#6BCB77'
    return '#4D96FF'
  }
</script>

<div class="gantt-container">
  <div class="timeline">
    {#each Array.from({length: 25}, (_, i) => i) as hour}
      <div class="timeline-marker" style="left: {(hour / 24) * 100}%">
        <span>{formatTime(hour % 24)}</span>
      </div>
    {/each}
  </div>
  
  <div class="price-indicator">
    {#each Array.from({length: 24}, (_, i) => i) as hour}
      <div 
        class="price-segment" 
        style="left: {(hour / 24) * 100}%; width: {100/24}%; background-color: {getPriceColor(hour, prices.hourlyPrices)}"
        title={`${formatTime(hour)} - 电价: ${prices.hourlyPrices[hour]} 元/度`}
      />
    {/each}
  </div>
  
  <div class="schedules">
    {#each sortedSchedules as schedule, i}
      {@const pos = getBarPosition(schedule)}
      {@const pos2 = getBarPosition2(schedule)}
      {@const color = colors[i % colors.length]}
      
      <div class="schedule-row">
        <div class="appliance-label">
          <div class="color-dot" style="background-color: {color}"></div>
          <span>{schedule.appliance.name}</span>
        </div>
        <div class="timeline-container">
          <div 
            class="bar"
            style="left: {pos.left}%; width: {pos.width}%; background-color: {color}"
            title="{schedule.appliance.name}: {formatTime(schedule.startHour)} - {formatTime(schedule.endHour)} ({schedule.durationHours}小时) | 费用: {schedule.totalCost.toFixed(2)}元"
          >
            {#if pos.width > 8}
              <span class="bar-text">
                {schedule.appliance.name} ({schedule.durationHours}h)
              </span>
            {/if}
          </div>
          
          {#if pos2}
            <div 
              class="bar"
              style="left: {pos2.left}%; width: {pos2.width}%; background-color: {color}"
              title="{schedule.appliance.name}: {formatTime(schedule.startHour)} - {formatTime(schedule.endHour)} ({schedule.durationHours}小时)"
            />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  
  <div class="legend">
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FF6B6B"></div>
      <span>尖峰时段 (≥1.0元/度)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #FFD93D"></div>
      <span>高峰时段 (0.8-1.0元/度)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background-color: #6BCB77"></div>
      <span>平时段 (0.5-0.8元/度)</span>
    </div>
    <div class="legend-item">
        <div class="legend-color" style="background-color: #4D96FF"></div>
        <span>谷时段 (低于0.5元/度)</span>
      </div>
  </div>
</div>

<style>
  .gantt-container {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    overflow-x: auto;
  }
  
  .timeline {
    position: relative;
    height: 30px;
    margin-left: 150px;
    margin-bottom: 10px;
    border-bottom: 1px solid #374151;
  }
  
  .timeline-marker {
    position: absolute;
    transform: translateX(-50%);
    font-size: 11px;
    color: #9ca3af;
    white-space: nowrap;
  }
  
  .price-indicator {
    position: relative;
    height: 20px;
    margin-left: 150px;
    margin-bottom: 20px;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .price-segment {
    position: absolute;
    height: 100%;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  
  .price-segment:hover {
    opacity: 0.9;
  }
  
  .schedules {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .schedule-row {
    display: flex;
    align-items: center;
    height: 36px;
  }
  
  .appliance-label {
    width: 150px;
    min-width: 150px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e5e7eb;
    font-size: 13px;
  }
  
  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .timeline-container {
    flex: 1;
    height: 100%;
    position: relative;
    background: #2a2a3e;
    border-radius: 4px;
  }
  
  .bar {
    position: absolute;
    height: 70%;
    top: 15%;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    opacity: 0.9;
  }
  
  .bar:hover {
    transform: scaleY(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 10;
  }
  
  .bar-text {
    font-size: 11px;
    color: white;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 4px;
  }
  
  .legend {
    display: flex;
    gap: 20px;
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #9ca3af;
  }
  
  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }
</style>
