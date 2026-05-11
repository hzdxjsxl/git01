const BASE_URL = '/api/transactions'

export const transactionApi = {
  async fetchByCursor(cursor = null, size = 100) {
    const response = await fetch(`${BASE_URL}/cursor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cursor, size })
    })
    return response.json()
  },
  
  async fetchLatest() {
    const response = await fetch(`${BASE_URL}/latest`)
    return response.json()
  }
}

export class TransactionPoller {
  constructor(options = {}) {
    this.onData = options.onData || (() => {})
    this.interval = options.interval || 3000
    this.timerId = null
    this.isRunning = false
    this.maxId = 0
  }
  
  async pollOnce() {
    try {
      const result = await transactionApi.fetchLatest()
      if (result.maxId > this.maxId) {
        this.maxId = result.maxId
        if (result.data && result.data.length > 0) {
          this.onData(result)
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
  }
  
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.pollOnce()
    this.timerId = setInterval(() => this.pollOnce(), this.interval)
  }
  
  stop() {
    this.isRunning = false
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
  
  setInterval(interval) {
    this.interval = interval
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }
}
