import type { QueueItem, AssignmentResult } from '@/utils/greedyMatch'

interface QueueListProps {
  queue: QueueItem[]
  assignments: AssignmentResult[]
  selectedQueueNumber: number | null
  onSelectQueue: (queueNumber: number) => void
}

export default function QueueList({
  queue,
  assignments,
  selectedQueueNumber,
  onSelectQueue,
}: QueueListProps) {
  const getAssignmentForQueue = (queueNumber: number) => {
    return assignments.find((a) => a.queueNumber === queueNumber)
  }

  const getWaitTimeColor = (waitTime: number) => {
    if (waitTime < 10) return 'text-green-600'
    if (waitTime < 20) return 'text-amber-600'
    return 'text-red-600'
  }

  const getPeopleCountStyle = (count: number) => {
    if (count <= 2) return 'bg-blue-100 text-blue-700'
    if (count <= 4) return 'bg-green-100 text-green-700'
    return 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        排队列表
      </h2>
      <div className="space-y-3">
        {queue.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            暂无排队
          </div>
        ) : (
          queue.map((item) => {
            const assignment = getAssignmentForQueue(item.number)
            const isSelected = selectedQueueNumber === item.number

            return (
              <div
                key={item.number}
                onClick={() => onSelectQueue(item.number)}
                className={`
                  p-4 rounded-xl border-2 cursor-pointer
                  transition-all duration-200
                  ${isSelected 
                    ? 'border-orange-500 bg-orange-50 shadow-md' 
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center text-lg font-bold text-white bg-orange-500 rounded-full">
                      {item.number}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">排队号</div>
                      <div className="font-semibold text-gray-800">
                        A{item.number}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPeopleCountStyle(item.peopleCount)}`}
                    >
                      {item.peopleCount} 人
                    </div>
                    <div className={`mt-1 text-sm font-medium ${getWaitTimeColor(item.waitTime)}`}>
                      等待 {item.waitTime} 分钟
                    </div>
                  </div>
                </div>

                {assignment && (
                  <div className="mt-3 p-3 bg-amber-100/50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      智能推荐
                    </div>
                    <div className="mt-1 text-sm text-amber-700">
                      {assignment.isMerged ? (
                        <span>
                          合并桌台: {assignment.tableIds.join(' + ')} 号桌
                          ({assignment.totalCapacity} 人容量)
                        </span>
                      ) : (
                        <span>
                          分配: {assignment.tableIds[0]} 号桌
                          ({assignment.totalCapacity} 人容量)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {!assignment && isSelected && (
                  <div className="mt-3 p-3 bg-red-100/50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      暂无可用桌台
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
