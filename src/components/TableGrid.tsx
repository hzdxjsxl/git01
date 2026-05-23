import { useMemo } from 'react'
import type { Table as TableType } from '@/utils/greedyMatch'

interface TableGridProps {
  tables: TableType[]
  highlightedTables: number[]
  onTableClick?: (tableId: number) => void
}

interface TableGroup {
  id: number
  members: number[]
  totalCapacity: number
  isOccupied: boolean
  isMerged: boolean
}

export default function TableGrid({
  tables,
  highlightedTables,
  onTableClick,
}: TableGridProps) {
  const tableGroups = useMemo(() => {
    const groups: TableGroup[] = []
    const processed = new Set<number>()

    for (const table of tables) {
      if (processed.has(table.id)) continue

      if (table.mergedWith.length > 0) {
        const groupMembers = [table.id, ...table.mergedWith]
        const totalCapacity = tables
          .filter((t) => groupMembers.includes(t.id))
          .reduce((sum, t) => sum + t.capacity, 0)
        const isOccupied = tables
          .filter((t) => groupMembers.includes(t.id))
          .every((t) => t.occupied)

        groups.push({
          id: table.id,
          members: groupMembers,
          totalCapacity,
          isOccupied,
          isMerged: true,
        })
        groupMembers.forEach((id) => processed.add(id))
      } else {
        groups.push({
          id: table.id,
          members: [table.id],
          totalCapacity: table.capacity,
          isOccupied: table.occupied,
          isMerged: false,
        })
        processed.add(table.id)
      }
    }

    return groups
  }, [tables])

  const getTableColor = (group: TableGroup) => {
    const isHighlighted = group.members.some((id) =>
      highlightedTables.includes(id)
    )

    if (isHighlighted) {
      return 'bg-amber-400 border-amber-500 shadow-lg shadow-amber-300/50'
    }

    if (group.isOccupied) {
      return 'bg-red-100 border-red-300'
    }

    if (group.isMerged) {
      return 'bg-blue-100 border-blue-400 border-2'
    }

    return 'bg-green-100 border-green-300'
  }

  const getCapacityColor = (group: TableGroup) => {
    if (group.isOccupied) return 'text-red-700'
    if (group.isMerged) return 'text-blue-700'
    return 'text-green-700'
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        桌台状态
      </h2>
      <div className="grid grid-cols-4 gap-4">
        {tableGroups.map((group) => (
          <div
            key={group.id}
            onClick={() => onTableClick?.(group.id)}
            className={`
              relative p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-300 ease-in-out
              hover:scale-105 hover:shadow-md
              ${getTableColor(group)}
            `}
          >
            {group.isMerged && (
              <div className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full">
                合并
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600">
                {group.isMerged ? (
                  <span>{group.members.join(' + ')} 号桌</span>
                ) : (
                  <span>{group.id} 号桌</span>
                )}
              </div>
              <div
                className={`text-2xl font-bold ${getCapacityColor(group)}`}
              >
                {group.totalCapacity}
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {group.totalCapacity} 人桌
            </div>

            <div className="mt-2">
              {group.isOccupied ? (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-200 rounded-full">
                  已占用
                </span>
              ) : group.isMerged ? (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-200 rounded-full">
                  可合并
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-200 rounded-full">
                  空闲
                </span>
              )}
            </div>

            {group.isMerged && (
              <div className="mt-2 flex flex-wrap gap-1">
                {group.members.map((id) => {
                  const table = tables.find((t) => t.id === id)
                  return (
                    <span
                      key={id}
                      className="px-1.5 py-0.5 text-xs bg-white/50 rounded"
                    >
                      {id}号({table?.capacity}人)
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
