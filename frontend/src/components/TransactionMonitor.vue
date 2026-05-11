<template>
  <div class="monitor-container">
    <div class="monitor-header">
      <h1 class="monitor-title">交易流水监控面板</h1>
      <div class="monitor-stats">
        <div class="stat-item">
          <span class="stat-label">总记录数</span>
          <span class="stat-value">{{ formattedStats.totalCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">加载状态</span>
          <span class="stat-value" :class="{ loading: isLoading }">
            {{ isLoading ? '加载中...' : '已就绪' }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">实时同步</span>
          <span class="stat-value" :class="{ 'sync-active': isPolling }">
            {{ isPolling ? '已开启' : '已关闭' }}
          </span>
        </div>
      </div>
      <div class="monitor-controls">
        <button @click="togglePolling" :class="{ active: isPolling }">
          {{ isPolling ? '停止同步' : '开始同步' }}
        </button>
        <button @click="loadMore" :disabled="!hasMore || isLoading">
          加载更多
        </button>
      </div>
    </div>
    
    <div class="table-wrapper">
      <div class="table-header">
        <div class="table-row">
          <div class="table-cell" style="width: 80px;">序号</div>
          <div class="table-cell" style="width: 200px;">交易单号</div>
          <div class="table-cell" style="width: 140px;">金额</div>
          <div class="table-cell" style="width: 100px;">状态</div>
          <div class="table-cell" style="width: 240px;">创建时间</div>
          <div class="table-cell" style="width: 120px;">商户ID</div>
          <div class="table-cell" style="width: 200px;">订单号</div>
        </div>
      </div>
      
      <div 
        ref="scrollContainer" 
        class="table-body"
        @scroll="handleScroll"
      >
        <div 
          class="table-padding-top"
          :style="{ height: paddingTop + 'px' }"
        ></div>
        
        <div 
          v-for="(item, index) in visibleTransactions" 
          :key="item.id"
          class="table-row"
          :class="{ 'row-new': item.__isNew }"
        >
          <div class="table-cell" style="width: 80px;">
            {{ startIndex + index + 1 }}
          </div>
          <div class="table-cell" style="width: 200px;">
            {{ item.transactionNo }}
          </div>
          <div class="table-cell amount" style="width: 140px;">
            {{ formattedTransactions[index].amount }}
          </div>
          <div class="table-cell" style="width: 100px;">
            <span :class="['status-badge', formattedTransactions[index].status.class]">
              {{ formattedTransactions[index].status.text }}
            </span>
          </div>
          <div class="table-cell" style="width: 240px;">
            {{ formattedTransactions[index].createTime }}
          </div>
          <div class="table-cell" style="width: 120px;">
            {{ item.merchantId }}
          </div>
          <div class="table-cell" style="width: 200px;">
            {{ item.orderNo }}
          </div>
        </div>
        
        <div 
          class="table-padding-bottom"
          :style="{ height: paddingBottom + 'px' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { transactionApi, TransactionPoller } from '../api/transactionApi'
import { formatTimestamp, formatAmount, formatStatus } from '../utils/format'

const ROW_HEIGHT = 48
const BUFFER_ROWS = 10
const BATCH_SIZE = 100

const scrollContainer = ref(null)
const transactions = ref([])
const containerHeight = ref(600)
const scrollTop = ref(0)
const isLoading = ref(false)
const hasMore = ref(true)
const nextCursor = ref(null)
const isPolling = ref(false)

const poller = ref(null)

const totalCount = computed(() => transactions.value.length)

const visibleRowCount = computed(() => {
  return Math.ceil(containerHeight.value / ROW_HEIGHT) + BUFFER_ROWS * 2
})

const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER_ROWS)
})

const endIndex = computed(() => {
  return Math.min(
    transactions.value.length,
    startIndex.value + visibleRowCount.value
  )
})

const visibleTransactions = computed(() => {
  return transactions.value.slice(startIndex.value, endIndex.value)
})

const formattedTransactions = computed(() => {
  return visibleTransactions.value.map(item => ({
    createTime: formatTimestamp(item.createTime),
    amount: formatAmount(item.amount),
    status: formatStatus(item.status)
  }))
})

const formattedStats = computed(() => ({
  totalCount: totalCount.value.toLocaleString()
}))

const paddingTop = computed(() => {
  return startIndex.value * ROW_HEIGHT
})

const paddingBottom = computed(() => {
  return Math.max(0, (transactions.value.length - endIndex.value) * ROW_HEIGHT)
})

function handleScroll() {
  if (!scrollContainer.value) return
  scrollTop.value = scrollContainer.value.scrollTop
  checkLoadMore()
}

function checkLoadMore() {
  if (!scrollContainer.value) return
  
  const { scrollTop: st, scrollHeight, clientHeight } = scrollContainer.value
  const threshold = ROW_HEIGHT * 20
  
  if (scrollHeight - st - clientHeight < threshold) {
    loadMore()
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  
  isLoading.value = true
  
  try {
    const result = await transactionApi.fetchByCursor(nextCursor.value, BATCH_SIZE)
    
    if (result.data && result.data.length > 0) {
      transactions.value = [...transactions.value, ...result.data]
    }
    
    hasMore.value = result.hasMore
    nextCursor.value = result.nextCursor
  } catch (error) {
    console.error('Load more error:', error)
  } finally {
    isLoading.value = false
  }
}

async function handleNewData(result) {
  if (!result.data || result.data.length === 0) return
  
  const existingIds = new Set(transactions.value.map(t => t.id))
  const newItems = result.data.filter(t => !existingIds.has(t.id))
  
  if (newItems.length > 0) {
    newItems.forEach(item => {
      item.__isNew = true
    })
    
    transactions.value = [...newItems, ...transactions.value]
    
    setTimeout(() => {
      newItems.forEach(item => {
        item.__isNew = false
      })
    }, 3000)
  }
}

function togglePolling() {
  if (isPolling.value) {
    poller.value?.stop()
    isPolling.value = false
  } else {
    poller.value?.start()
    isPolling.value = true
  }
}

function updateContainerHeight() {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
}

onMounted(async () => {
  poller.value = new TransactionPoller({
    interval: 3000,
    onData: handleNewData
  })
  
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
  
  await loadMore()
})

onUnmounted(() => {
  poller.value?.stop()
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<style scoped>
.monitor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-sizing: border-box;
}

.monitor-header {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.monitor-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 16px 0;
}

.monitor-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #888;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stat-value.loading {
  color: #f59e0b;
}

.stat-value.sync-active {
  color: #10b981;
}

.monitor-controls {
  display: flex;
  gap: 12px;
}

.monitor-controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f0f0f0;
  color: #333;
}

.monitor-controls button:hover:not(:disabled) {
  background: #e0e0e0;
}

.monitor-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.monitor-controls button.active {
  background: #10b981;
  color: white;
}

.monitor-controls button.active:hover {
  background: #059669;
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.table-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.3s ease;
}

.table-row:hover {
  background: #f8fafc;
}

.table-header .table-row {
  background: #f1f5f9;
}

.table-header .table-row:hover {
  background: #f1f5f9;
}

.table-cell {
  padding: 12px 16px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.table-header .table-cell {
  font-weight: 600;
  color: #475569;
}

.table-cell.amount {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-processing {
  background: #dbeafe;
  color: #2563eb;
}

.status-success {
  background: #d1fae5;
  color: #059669;
}

.status-failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-cancelled {
  background: #e5e7eb;
  color: #6b7280;
}

.status-unknown {
  background: #f3f4f6;
  color: #9ca3af;
}

.row-new {
  animation: newRowFlash 3s ease-out;
}

@keyframes newRowFlash {
  0% {
    background-color: #dbeafe;
  }
  100% {
    background-color: transparent;
  }
}

.table-padding-top,
.table-padding-bottom {
  width: 100%;
}

.table-body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-body::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.table-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
