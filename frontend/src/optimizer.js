export function optimizeSchedule(appliances, prices) {
  const hourlyPrices = prices.hourlyPrices
  
  const scheduleAppliance = (appliance, fixedAppliances) => {
    const { id, name, powerWatts, durationHours, usageWindow } = appliance
    
    if (durationHours === 24) {
      const schedule = []
      for (let hour = 0; hour < 24; hour++) {
        schedule.push({
          hour,
          active: true,
          cost: (powerWatts / 1000) * hourlyPrices[hour]
        })
      }
      return {
        appliance,
        schedule,
        startHour: 0,
        endHour: 24,
        totalCost: schedule.reduce((sum, s) => sum + s.cost, 0)
      }
    }
    
    let windowStart, windowEnd
    if (usageWindow && usageWindow.length >= 2) {
      windowStart = usageWindow[0]
      windowEnd = usageWindow[1] % 24
    } else {
      windowStart = 0
      windowEnd = 24
    }
    
    let bestStartHour = windowStart
    let minCost = Infinity
    
    const isHourOccupied = (hour, fixedSchedules) => {
      for (const schedule of fixedSchedules) {
        if (schedule.schedule[hour % 24] && schedule.schedule[hour % 24].active) {
          return true
        }
      }
      return false
    }
    
    const canStartAt = (startHour) => {
      for (let h = 0; h < durationHours; h++) {
        const hour = (startHour + h) % 24
        
        if (windowStart < windowEnd) {
          if (hour < windowStart || hour >= windowEnd) return false
        } else {
          if (hour >= windowEnd && hour < windowStart) return false
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
        cost += (powerWatts / 1000) * hourlyPrices[hour]
      }
      return cost
    }
    
    for (let startHour = 0; startHour < 24; startHour++) {
      if (canStartAt(startHour)) {
        const cost = calculateCost(startHour)
        if (cost < minCost) {
          minCost = cost
          bestStartHour = startHour
        }
      }
    }
    
    const schedule = []
    for (let hour = 0; hour < 24; hour++) {
      let isActive = false
      for (let h = 0; h < durationHours; h++) {
        if ((bestStartHour + h) % 24 === hour) {
          isActive = true
          break
        }
      }
      
      schedule.push({
        hour,
        active: isActive,
        cost: isActive ? (powerWatts / 1000) * hourlyPrices[hour] : 0
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
  
  const schedulableAppliances = appliances.filter(a => a.durationHours < 24)
  const alwaysOnAppliances = appliances.filter(a => a.durationHours === 24)
  
  schedulableAppliances.sort((a, b) => {
    const costA = a.powerWatts * a.durationHours
    const costB = b.powerWatts * b.durationHours
    return costB - costA
  })
  
  const results = []
  const fixedSchedules = []
  
  for (const appliance of alwaysOnAppliances) {
    const result = scheduleAppliance(appliance, [])
    results.push(result)
    fixedSchedules.push(result)
  }
  
  for (const appliance of schedulableAppliances) {
    const result = scheduleAppliance(appliance, fixedSchedules)
    results.push(result)
    fixedSchedules.push(result)
  }
  
  return {
    schedules: results,
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    peakPower: calculatePeakPower(results),
    hourlyCosts: calculateHourlyCosts(results, hourlyPrices),
    totalPowerConsumption: calculateTotalPower(results)
  }
}

function calculatePeakPower(schedules) {
  let maxPower = 0
  
  for (let hour = 0; hour < 24; hour++) {
    let power = 0
    for (const schedule of schedules) {
      if (schedule.schedule[hour].active) {
        power += schedule.appliance.powerWatts
      }
    }
    if (power > maxPower) {
      maxPower = power
    }
  }
  
  return maxPower
}

function calculateHourlyCosts(schedules, hourlyPrices) {
  const costs = new Array(24).fill(0)
  
  for (const schedule of schedules) {
    for (let hour = 0; hour < 24; hour++) {
      if (schedule.schedule[hour].active) {
        costs[hour] += schedule.schedule[hour].cost
      }
    }
  }
  
  return costs
}

function calculateTotalPower(schedules) {
  let totalKWh = 0
  
  for (const schedule of schedules) {
    totalKWh += schedule.durationHours * (schedule.appliance.powerWatts / 1000)
  }
  
  return totalKWh
}

export function calculateBaselineCost(appliances, prices) {
  const hourlyPrices = prices.hourlyPrices
  let totalCost = 0
  
  for (const appliance of appliances) {
    const { powerWatts, durationHours } = appliance
    
    let midDayStart = 12
    for (let h = 0; h < durationHours; h++) {
      const hour = (midDayStart + h) % 24
      totalCost += (powerWatts / 1000) * hourlyPrices[hour]
    }
  }
  
  return totalCost
}
