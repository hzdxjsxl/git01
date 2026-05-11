const WS_URL = 'ws://localhost:8080/ws/cluster'
const HEARTBEAT_INTERVAL = 10000
const HEARTBEAT_TIMEOUT = 5000
const RECONNECT_INTERVAL = 3000
const MAX_RECONNECT_INTERVAL = 60000
const WINDOW_SIZE_SECONDS = 60

class WebSocketService {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.isManualClose = false
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null

    this.dataWindow = new Map()
    this.listeners = new Map()
  }

  connect() {
    if (this.ws && this.isConnected) {
      return
    }

    this.isManualClose = false

    try {
      this.ws = new WebSocket(WS_URL)
      this.setupEventHandlers()
    } catch (error) {
      console.error('WebSocket 连接错误:', error)
      this.scheduleReconnect()
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('WebSocket 连接已建立')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.notifyListeners('connect', { connected: true })
    }

    this.ws.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          this.handlePong()
          return
        }

        const data = JSON.parse(event.data)
        this.processData(data)
      } catch (error) {
        console.error('消息解析错误:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      this.notifyListeners('error', { error })
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket 连接已关闭', event.code, event.reason)
      this.isConnected = false
      this.stopHeartbeat()
      this.notifyListeners('connect', { connected: false })

      if (!this.isManualClose) {
        this.scheduleReconnect()
      }
    }
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send('ping')
          this.heartbeatTimeoutTimer = setTimeout(() => {
            console.warn('心跳超时，关闭连接')
            this.ws.close()
          }, HEARTBEAT_TIMEOUT)
        } catch (error) {
          console.error('发送心跳失败:', error)
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  handlePong() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_INTERVAL
    )

    console.log(`将在 ${delay}ms 后尝试重连 (第 ${this.reconnectAttempts} 次)`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  disconnect() {
    this.isManualClose = true
    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
  }

  processData(metricsList) {
    const now = Date.now()
    const cutoffTime = now - WINDOW_SIZE_SECONDS * 1000

    metricsList.forEach(metric => {
      const { nodeId, cpuUsage, memoryUsage, timestamp } = metric

      if (!this.dataWindow.has(nodeId)) {
        this.dataWindow.set(nodeId, [])
      }

      const window = this.dataWindow.get(nodeId)
      window.push({ cpu: cpuUsage, memory: memoryUsage, timestamp: timestamp || now })

      while (window.length > 0 && window[0].timestamp < cutoffTime) {
        window.shift()
      }
    })

    const summary = this.calculateSummary()
    this.notifyListeners('data', summary)
  }

  calculateSummary() {
    const result = {
      nodes: [],
      overall: {
        avgCpu: 0,
        avgMemory: 0,
        nodesOnline: this.dataWindow.size
      }
    }

    let totalCpu = 0
    let totalMemory = 0
    let nodeCount = 0

    this.dataWindow.forEach((window, nodeId) => {
      if (window.length === 0) {
        return
      }

      const latest = window[window.length - 1]
      const cpuValues = window.map(d => d.cpu)
      const memoryValues = window.map(d => d.memory)

      const avgCpu = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
      const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length

      const trendData = window.map(d => ({
        time: new Date(d.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        cpu: d.cpu,
        memory: d.memory
      }))

      result.nodes.push({
        nodeId,
        currentCpu: latest.cpu,
        currentMemory: latest.memory,
        avgCpu: Math.round(avgCpu * 100) / 100,
        avgMemory: Math.round(avgMemory * 100) / 100,
        maxCpu: Math.max(...cpuValues),
        minCpu: Math.min(...cpuValues),
        maxMemory: Math.max(...memoryValues),
        minMemory: Math.min(...memoryValues),
        dataPoints: window.length,
        trendData
      })

      totalCpu += latest.cpu
      totalMemory += latest.memory
      nodeCount++
    })

    result.nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId))

    if (nodeCount > 0) {
      result.overall.avgCpu = Math.round((totalCpu / nodeCount) * 100) / 100
      result.overall.avgMemory = Math.round((totalMemory / nodeCount) * 100) / 100
    }

    return result
  }

  getNodeData(nodeId) {
    return this.dataWindow.get(nodeId) || []
  }

  getAllData() {
    return this.calculateSummary()
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`监听器执行错误 (${event}):`, error)
        }
      })
    }
  }
}

export default new WebSocketService()