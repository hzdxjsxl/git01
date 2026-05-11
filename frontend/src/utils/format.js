const CURRENCY_SYMBOL = '¥'

export function formatTimestamp(timestamp) {
  if (!timestamp) return '-'
  
  const date = new Date(timestamp)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export function formatAmount(amount) {
  if (amount == null) return '-'
  
  const str = String(Math.abs(amount))
  const decimal = str.length > 2 ? str.slice(-2) : str.padStart(2, '0')
  const integer = str.length > 2 ? str.slice(0, -2) : '0'
  
  const parts = []
  let remaining = integer
  
  while (remaining.length > 3) {
    parts.unshift(remaining.slice(-3))
    remaining = remaining.slice(0, -3)
  }
  parts.unshift(remaining)
  
  const isNegative = amount < 0
  const prefix = isNegative ? '-' : ''
  
  return `${prefix}${CURRENCY_SYMBOL}${parts.join(',')}.${decimal}`
}

export function formatStatus(status) {
  const statusMap = {
    0: { text: '待处理', class: 'status-pending' },
    1: { text: '处理中', class: 'status-processing' },
    2: { text: '成功', class: 'status-success' },
    3: { text: '失败', class: 'status-failed' },
    4: { text: '已取消', class: 'status-cancelled' }
  }
  
  return statusMap[status] || { text: `状态${status}`, class: 'status-unknown' }
}
