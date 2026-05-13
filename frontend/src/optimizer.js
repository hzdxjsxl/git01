export function optimizeSchedule(appliances, prices) {
  console.log('=== 开始优化计算 ===')
  console.log('电器数量:', appliances ? appliances.length : 0)
  console.log('电价数据:', prices)
  
  const hourlyPrices = prices.hourlyPrices
  console.log('24小时电价:', hourlyPrices)
  
  if (!hourlyPrices || hourlyPrices.length !== 24) {
    console.error('电价数据格式错误!')
    return { schedules: [], totalCost: 0, peakPower: 0, hourlyCosts: [], totalPowerConsumption: 0 }
  }
  
  const scheduleAppliance = (appliance, fixedAppliances, applianceIndex) => {
    const { id, name, powerWatts, durationHours, usageWindow } = appliance
    
    console.log(`\n--- 调度电器 [${applianceIndex}] ${name} ---`)
    console.log(`  功率: ${powerWatts}W, 时长: ${durationHours}h`)
    console.log(`  使用窗口:`, usageWindow)
    
    if (!powerWatts || !durationHours) {
      console.error(`  电器数据异常! powerWatts=${powerWatts}, durationHours=${durationHours}`)
      return null
    }
    
    if (durationHours === 24) {
      console.log(`  这是24小时运行的电器，跳过时间窗口检查`)
      const schedule = []
      let totalCost = 0
      for (let hour = 0; hour < 24; hour++) {
        const price = hourlyPrices[hour] || 0
        const cost = (powerWatts / 1000) * price
        totalCost += cost
        schedule.push({
          hour,
          active: true,
          cost: cost
        })
      }
      console.log(`  24小时运行电器成本: ¥${totalCost.toFixed(4)}`)
      return {
        appliance,
        schedule,
        startHour: 0,
        endHour: 24,
        durationHours: 24,
        totalCost: totalCost
      }
    }
    
    let windowStart, windowEnd
    if (usageWindow && Array.isArray(usageWindow) && usageWindow.length >= 2) {
      windowStart = usageWindow[0]
      windowEnd = usageWindow[1] % 24
    } else {
      windowStart = 0
      windowEnd = 24
    }
    console.log(`  使用窗口: [${windowStart}, ${windowEnd})`)
    
    let bestStartHour = -1
    let minCost = Number.MAX_VALUE
    let validStartHours = []
    
    const isHourOccupied = (hour, fixedSchedules) => {
      for (const schedule of fixedSchedules) {
        if (schedule.appliance.durationHours === 24) {
          continue
        }
        if (schedule.schedule && schedule.schedule[hour % 24] && schedule.schedule[hour % 24].active) {
          return true
        }
      }
      return false
    }
    
    const canStartAt = (startHour) => {
      for (let h = 0; h < durationHours; h++) {
        const hour = (startHour + h) % 24
        
        if (windowStart < windowEnd) {
          if (hour < windowStart || hour >= windowEnd) {
            return false
          }
        } else {
          if (hour >= windowEnd && hour < windowStart) {
            return false
          }
        }
        
        if (isHourOccupied(hour, fixedAppliances)) {
          return false
        }
      }
      return true
    }
    
    const calculateCost = (startHour) => {
      let cost = 0
      for (let h = 0; h < durationHours; h++) {
        const hour = (startHour + h) % 24
        const price = hourlyPrices[hour]
        if (price === undefined || price === null || isNaN(price)) {
          console.error(`    电价数据异常! hour=${hour}, price=${price}`)
          return Number.MAX_VALUE
        }
        cost += (powerWatts / 1000) * price
      }
      return cost
    }
    
    console.log(`  扫描所有可能的开始时间 (0-23):`)
    for (let startHour = 0; startHour < 24; startHour++) {
      if (canStartAt(startHour)) {
        const cost = calculateCost(startHour)
        validStartHours.push({ hour: startHour, cost: cost })
        console.log(`    时间 ${startHour}:00 可用, 成本=¥${cost.toFixed(4)}`)
        
        if (cost < minCost) {
          minCost = cost
          bestStartHour = startHour
        }
      }
    }
    
    console.log(`  可用时间点数量: ${validStartHours.length}`)
    
    if (bestStartHour === -1 || minCost === Number.MAX_VALUE) {
      console.warn(`  警告: 没有找到可用的开始时间! 尝试放宽约束...`)
      
      bestStartHour = windowStart
      minCost = calculateCost(windowStart)
      console.log(`  强制使用窗口开始时间: ${windowStart}:00, 成本=¥${minCost.toFixed(4)}`)
    }
    
    console.log(`  >>> 最优选择: 开始时间=${bestStartHour}:00, 成本=¥${minCost.toFixed(4)}`)
    
    const schedule = []
    for (let hour = 0; hour < 24; hour++) {
      let isActive = false
      for (let h = 0; h < durationHours; h++) {
        if ((bestStartHour + h) % 24 === hour) {
          isActive = true
          break
        }
      }
      
      const price = hourlyPrices[hour] || 0
      schedule.push({
        hour,
        active: isActive,
        cost: isActive ? (powerWatts / 1000) * price : 0
      })
    }
    
    return {
      appliance,
      schedule,
      startHour: bestStartHour,
      endHour: (bestStartHour + durationHours) % 24,
      durationHours,
      totalCost: minCost
    }
  }
  
  const validAppliances = (appliances || []).filter(a => a && a.powerWatts && a.durationHours)
  console.log('\n=== 电器分类 ===')
  console.log('全部电器:', validAppliances.map(a => `${a.name}(${a.powerWatts}W, ${a.durationHours}h)`))
  
  const schedulableAppliances = validAppliances.filter(a => a.durationHours < 24)
  const alwaysOnAppliances = validAppliances.filter(a => a.durationHours === 24)
  
  console.log('可调度电器:', schedulableAppliances.map(a => a.name))
  console.log('24小时运行电器:', alwaysOnAppliances.map(a => a.name))
  
  schedulableAppliances.sort((a, b) => {
    const costA = (a.powerWatts || 0) * (a.durationHours || 0)
    const costB = (b.powerWatts || 0) * (b.durationHours || 0)
    return costB - costA
  })
  
  console.log('\n排序后顺序:', schedulableAppliances.map(a => a.name))
  
  const results = []
  const fixedSchedules = []
  
  console.log('\n=== 开始调度24小时运行电器 ===')
  for (const appliance of alwaysOnAppliances) {
    const result = scheduleAppliance(appliance, [], results.length)
    if (result) {
      results.push(result)
      fixedSchedules.push(result)
    }
  }
  
  console.log('\n=== 开始调度可调度电器 ===')
  for (const appliance of schedulableAppliances) {
    const result = scheduleAppliance(appliance, fixedSchedules, results.length)
    if (result) {
      results.push(result)
      fixedSchedules.push(result)
    }
  }
  
  console.log('\n=== 调度结果汇总 ===')
  let totalCost = 0
  let totalPower = 0
  for (const r of results) {
    console.log(`  ${r.appliance.name}: ${r.startHour}:00-${r.endHour === 0 ? '24' : r.endHour}:00 (${r.durationHours}h), 成本=¥${r.totalCost.toFixed(4)}`)
    totalCost += r.totalCost
    totalPower += r.durationHours * (r.appliance.powerWatts / 1000)
  }
  
  console.log(`\n=== 最终统计 ===`)
  console.log(`总电费: ¥${totalCost.toFixed(4)}`)
  console.log(`总耗电量: ${totalPower.toFixed(2)} kWh`)
  
  const peakPower = calculatePeakPower(results)
  console.log(`峰值功率: ${peakPower}W`)
  
  return {
    schedules: results,
    totalCost: isNaN(totalCost) ? 0 : totalCost,
    peakPower: isNaN(peakPower) ? 0 : peakPower,
    hourlyCosts: calculateHourlyCosts(results, hourlyPrices),
    totalPowerConsumption: isNaN(totalPower) ? 0 : totalPower
  }
}

function calculatePeakPower(schedules) {
  let maxPower = 0
  
  if (!schedules || schedules.length === 0) return 0
  
  for (let hour = 0; hour < 24; hour++) {
    let power = 0
    for (const schedule of schedules) {
      if (schedule && schedule.schedule && schedule.schedule[hour] && schedule.schedule[hour].active) {
        const appliancePower = schedule.appliance ? schedule.appliance.powerWatts : 0
        if (appliancePower && !isNaN(appliancePower)) {
          power += appliancePower
        }
      }
    }
    if (power > maxPower && !isNaN(power)) {
      maxPower = power
    }
  }
  
  return maxPower
}

function calculateHourlyCosts(schedules, hourlyPrices) {
  const costs = new Array(24).fill(0)
  
  if (!schedules || !hourlyPrices) return costs
  
  for (const schedule of schedules) {
    if (!schedule || !schedule.schedule) continue
    for (let hour = 0; hour < 24; hour++) {
      if (schedule.schedule[hour] && schedule.schedule[hour].active) {
        const cost = schedule.schedule[hour].cost
        if (cost && !isNaN(cost)) {
          costs[hour] += cost
        }
      }
    }
  }
  
  return costs
}

function calculateTotalPower(schedules) {
  let totalKWh = 0
  
  if (!schedules) return 0
  
  for (const schedule of schedules) {
    if (!schedule || !schedule.appliance) continue
    const duration = schedule.durationHours
    const power = schedule.appliance.powerWatts
    if (duration && power && !isNaN(duration) && !isNaN(power)) {
      totalKWh += duration * (power / 1000)
    }
  }
  
  return totalKWh
}

export function calculateBaselineCost(appliances, prices) {
  console.log('\n=== 计算基准成本（未优化）===')
  
  if (!appliances || !prices || !prices.hourlyPrices) {
    console.error('基准成本计算: 数据缺失')
    return 0
  }
  
  const hourlyPrices = prices.hourlyPrices
  let totalCost = 0
  
  for (const appliance of appliances) {
    if (!appliance || !appliance.powerWatts || !appliance.durationHours) continue
    
    const { powerWatts, durationHours, name } = appliance
    
    let midDayStart = 12
    let applianceCost = 0
    
    for (let h = 0; h < durationHours; h++) {
      const hour = (midDayStart + h) % 24
      const price = hourlyPrices[hour] || 0
      applianceCost += (powerWatts / 1000) * price
    }
    
    console.log(`  ${name}: 假设从12:00开始运行, 成本=¥${applianceCost.toFixed(4)}`)
    totalCost += applianceCost
  }
  
  console.log(`基准总成本: ¥${totalCost.toFixed(4)}`)
  return totalCost
}
