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
  
  const [, ip, timestamp, method, path, statusCodeStr, latencyStr] = match
  
  return {
    ip,
    statusCode: parseInt(statusCodeStr, 10),
    latency: parseFloat(latencyStr),
    timestamp,
    method,
    path,
    rawLine: line,
    isValid: true
  }
}

export function parseLogLines(lines: string[]): ParsedLogEntry[] {
  return lines.map(line => parseLogLine(line))
}

export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0
  
  const index = (percentile / 100) * (sortedValues.length - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex]
  }
  
  const lowerValue = sortedValues[lowerIndex]
  const upperValue = sortedValues[upperIndex]
  const fraction = index - lowerIndex
  
  return lowerValue + (upperValue - lowerValue) * fraction
}

export function calculateStatistics(entries: ParsedLogEntry[]): LogStatistics {
  const validEntries = entries.filter(e => e.isValid)
  const totalRequests = entries.length
  const validRequests = validEntries.length
  
  if (validEntries.length === 0) {
    return {
      totalRequests,
      validRequests,
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
  
  const latencies = validEntries.map(e => e.latency).sort((a, b) => a - b)
  const sumLatency = latencies.reduce((acc, val) => acc + val, 0)
  
  const statusCodeDistribution: Record<number, number> = {}
  for (const entry of validEntries) {
    statusCodeDistribution[entry.statusCode] = (statusCodeDistribution[entry.statusCode] || 0) + 1
  }
  
  const ipCounts: Record<string, number> = {}
  for (const entry of validEntries) {
    ipCounts[entry.ip] = (ipCounts[entry.ip] || 0) + 1
  }
  
  const topIPs = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalRequests,
    validRequests,
    p99Latency: calculatePercentile(latencies, 99),
    p95Latency: calculatePercentile(latencies, 95),
    p50Latency: calculatePercentile(latencies, 50),
    avgLatency: sumLatency / latencies.length,
    maxLatency: latencies[latencies.length - 1],
    minLatency: latencies[0],
    statusCodeDistribution,
    topIPs
  }
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
