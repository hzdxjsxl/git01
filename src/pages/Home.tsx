import { useState, useEffect, useCallback } from 'react'
import TableGrid from '@/components/TableGrid'
import QueueList from '@/components/QueueList'
import {
  greedyMatchAlgorithm,
  type Table as TableType,
  type QueueItem,
  type AssignmentResult,
} from '@/utils/greedyMatch'

interface RestaurantStatus {
  tables: TableType[]
  queue: QueueItem[]
  emptyTables: number
  totalCapacity: number
}

export default function Home() {
  const [status, setStatus] = useState<RestaurantStatus | null>(null)
  const [assignments, setAssignments] = useState<AssignmentResult[]>([])
  const [highlightedTables, setHighlightedTables] = useState<number[]>([])
  const [selectedQueueNumber, setSelectedQueueNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/restaurant/status')
      if (!response.ok) throw new Error('获取数据失败')
      const data = await response.json()
      setStatus(data)

      const result = greedyMatchAlgorithm(data.tables, data.queue)
      setAssignments(result.assignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleSelectQueue = (queueNumber: number) => {
    setSelectedQueueNumber(queueNumber)
    const assignment = assignments.find((a) => a.queueNumber === queueNumber)
    if (assignment) {
      setHighlightedTables(assignment.tableIds)
    } else {
      setHighlightedTables([])
    }
  }

  const handleAssign = async () => {
    if (!selectedQueueNumber) return

    const assignment = assignments.find(
      (a) => a.queueNumber === selectedQueueNumber
    )
    if (!assignment) return

    try {
      const response = await fetch('/api/restaurant/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueNumber: selectedQueueNumber,
          tableIds: assignment.tableIds,
        }),
      })
      if (!response.ok) throw new Error('分配失败')
      await fetchStatus()
      setSelectedQueueNumber(null)
      setHighlightedTables([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '分配失败')
    }
  }

  const handleReset = async () => {
    try {
      const response = await fetch('/api/restaurant/reset', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('重置失败')
      await fetchStatus()
      setSelectedQueueNumber(null)
      setHighlightedTables([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    }
  }

  const currentAssignment = selectedQueueNumber
    ? assignments.find((a) => a.queueNumber === selectedQueueNumber)
    : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center text-red-500 bg-red-100 rounded-full">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg text-gray-800 mb-4">{error}</p>
          <button
            onClick={fetchStatus}
            className="px-6 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  餐厅排号调度系统
                </h1>
                <p className="text-sm text-gray-500">
                  智能桌台分配 · 高效翻台管理
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectQueue(103)}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                模拟A103拼桌
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                重置数据
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {status && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl shadow-md">
              <div className="text-sm text-gray-500">空桌数量</div>
              <div className="mt-1 text-3xl font-bold text-green-600">
                {status.emptyTables}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-md">
              <div className="text-sm text-gray-500">排队人数</div>
              <div className="mt-1 text-3xl font-bold text-orange-600">
                {status.queue.length}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-md">
              <div className="text-sm text-gray-500">总容量</div>
              <div className="mt-1 text-3xl font-bold text-blue-600">
                {status.totalCapacity} 人
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-md">
              <div className="text-sm text-gray-500">可分配方案</div>
              <div className="mt-1 text-3xl font-bold text-purple-600">
                {assignments.length}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {status && (
              <TableGrid
                tables={status.tables}
                highlightedTables={highlightedTables}
              />
            )}
          </div>

          <div>
            {status && (
              <QueueList
                queue={status.queue}
                assignments={assignments}
                selectedQueueNumber={selectedQueueNumber}
                onSelectQueue={handleSelectQueue}
              />
            )}
          </div>
        </div>

        {currentAssignment && (
          <div className="mt-6 p-6 bg-white rounded-2xl shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-gray-800">
              分配方案确认
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  排队号 <span className="font-bold text-orange-600">A{currentAssignment.queueNumber}</span>
                  {' '}共 <span className="font-bold">{currentAssignment.peopleCount}</span> 人
                </p>
                <p className="mt-2 text-gray-600">
                  {currentAssignment.isMerged ? (
                    <>
                      建议合并: <span className="font-bold text-blue-600">
                        {currentAssignment.tableIds.join(' + ')} 号桌
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        (总容量 {currentAssignment.totalCapacity} 人)
                      </span>
                    </>
                  ) : (
                    <>
                      分配: <span className="font-bold text-green-600">
                        {currentAssignment.tableIds[0]} 号桌
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        (容量 {currentAssignment.totalCapacity} 人)
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handleAssign}
                className="px-8 py-3 text-white font-medium bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
              >
                确认分配
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 p-6 bg-white rounded-2xl shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-gray-800">
            图例说明
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-300 rounded-lg" />
              <span className="text-sm text-gray-600">空闲桌台</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 border-2 border-red-300 rounded-lg" />
              <span className="text-sm text-gray-600">已占用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded-lg" />
              <span className="text-sm text-gray-600">合并桌台</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-400 border-2 border-amber-500 rounded-lg shadow-md" />
              <span className="text-sm text-gray-600">推荐桌台</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 py-4 text-center text-sm text-gray-500">
        餐厅排号调度系统 · 智能匹配算法
      </footer>
    </div>
  )
}
