export interface ParsedLogEntry {
  ip: string
  statusCode: number
  latency: number
  timestamp: string
  method: string
  path: string
  rawLine: string
  isValid: boolean
}

export interface LogStatistics {
  totalRequests: number
  validRequests: number
  p99Latency: number
  p95Latency: number
  p50Latency: number
  avgLatency: number
  maxLatency: number
  minLatency: number
  statusCodeDistribution: Record<number, number>
  topIPs: Array<{ ip: string; count: number }>
}

const NGINX_LOG_PATTERN = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) HTTP\/\d+\.\d+" (\d+) \d+ "[^"]*" "[^"]*" (\d+\.?\d*)/

export function parseLogLine(line: string): ParsedLogEntry {
  const match = line.match(NGINX_LOG_PATTERN)
  
  if (!match) {
    return {
      ip: '',
      statusCode: 0,
      latency: 0,
      timestamp: '',
      method: '',
      path: '',
      rawLine: line,
      isValid: false
    }
  }
  
  return {
    ip: match[1],
    statusCode: parseInt(match[5], 10),
    latency: parseFloat(match[6]),
    timestamp: match[2],
    method: match[3],
    path: match[4],
    rawLine: line,
    isValid: true
  }
}

export function parseLogLines(lines: string[]): ParsedLogEntry[] {
  const result = new Array<ParsedLogEntry>(lines.length)
  for (let i = 0; i < lines.length; i++) {
    result[i] = parseLogLine(lines[i])
  }
  return result
}

function swap32(arr: Float64Array, i: number, j: number): void {
  const temp = arr[i]
  arr[i] = arr[j]
  arr[j] = temp
}

function partition32(arr: Float64Array, low: number, high: number): number {
  const pivot = arr[high]
  let i = low - 1
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++
      swap32(arr, i, j)
    }
  }
  swap32(arr, i + 1, high)
  return i + 1
}

function quickSelect32(arr: Float64Array, k: number): number {
  let low = 0
  let high = arr.length - 1
  
  while (low < high) {
    const pivotIndex = partition32(arr, low, high)
    if (pivotIndex === k) {
      return arr[k]
    } else if (pivotIndex < k) {
      low = pivotIndex + 1
    } else {
      high = pivotIndex - 1
    }
  }
  return arr[k]
}

function nthElementPercentile(arr: Float64Array, percentile: number): number {
  const n = arr.length
  if (n === 0) return 0
  
  const index = (percentile / 100) * (n - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  
  if (lowerIndex === upperIndex) {
    const arr2 = new Float64Array(arr)
    quickSelect32(arr2, lowerIndex)
    return arr2[lowerIndex]
  }
  
  const arrLower = new Float64Array(arr)
  quickSelect32(arrLower, lowerIndex)
  const lowerValue = arrLower[lowerIndex]
  
  const arrUpper = new Float64Array(arr)
  quickSelect32(arrUpper, upperIndex)
  const upperValue = arrUpper[upperIndex]
  
  const fraction = index - lowerIndex
  return lowerValue + (upperValue - lowerValue) * fraction
}

export function calculateStatistics(entries: ParsedLogEntry[]): LogStatistics {
  const totalRequests = entries.length
  const statusCodeDistribution: Record<number, number> = {}
  const ipCounts: Record<string, number> = {}
  
  let sumLatency = 0
  let minLatency = Number.POSITIVE_INFINITY
  let maxLatency = Number.NEGATIVE_INFINITY
  let validRequests = 0
  
  const latenciesList: number[] = []
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry.isValid) continue
    
    validRequests++
    const latency = entry.latency
    latenciesList.push(latency)
    sumLatency += latency
    
    if (latency < minLatency) minLatency = latency
    if (latency > maxLatency) maxLatency = latency
    
    statusCodeDistribution[entry.statusCode] = (statusCodeDistribution[entry.statusCode] || 0) + 1
    ipCounts[entry.ip] = (ipCounts[entry.ip] || 0) + 1
  }
  
  if (validRequests === 0) {
    return {
      totalRequests,
      validRequests: 0,
      p99Latency: 0,
      p95Latency: 0,
      p50Latency: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: 0,
      statusCodeDistribution: {},
      topIPs: []
    }
  }
  
  const latenciesArray = new Float64Array(latenciesList)
  
  const p99 = nthElementPercentile(latenciesArray, 99)
  const p95 = nthElementPercentile(latenciesArray, 95)
  const p50 = nthElementPercentile(latenciesArray, 50)
  
  const ipEntries = Object.entries(ipCounts)
  const topIPsCount = Math.min(10, ipEntries.length)
  const topIPs = new Array<{ ip: string; count: number }>(topIPsCount)
  
  for (let i = 0; i < topIPsCount; i++) {
    let maxCount = 0
    let maxIdx = 0
    for (let j = 0; j < ipEntries.length; j++) {
      if (ipEntries[j][1] > maxCount) {
        maxCount = ipEntries[j][1]
        maxIdx = j
      }
    }
    topIPs[i] = { ip: ipEntries[maxIdx][0], count: maxCount }
    ipEntries[maxIdx] = ['', 0]
  }
  
  return {
    totalRequests,
    validRequests,
    p99Latency: p99,
    p95Latency: p95,
    p50Latency: p50,
    avgLatency: sumLatency / validRequests,
    maxLatency,
    minLatency,
    statusCodeDistribution,
    topIPs
  }
}

export function processLogData(lines: string[]): { entries: ParsedLogEntry[]; stats: LogStatistics } {
  const entries = parseLogLines(lines)
  const stats = calculateStatistics(entries)
  return { entries, stats }
}

export function getStatusCodeColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '#10b981'
  if (statusCode >= 300 && statusCode < 400) return '#3b82f6'
  if (statusCode >= 400 && statusCode < 500) return '#f59e0b'
  if (statusCode >= 500) return '#ef4444'
  return '#6b7280'
}

export function getStatusCodeLabel(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '成功'
  if (statusCode >= 300 && statusCode < 400) return '重定向'
  if (statusCode >= 400 && statusCode < 500) return '客户端错误'
  if (statusCode >= 500) return '服务器错误'
  return '未知'
}
