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
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

export default function TableGrid({
  tables,
  highlightedTables,
  onTableClick,
}: TableGridProps) {
  const { gridRows, gridCols, tableGroups } = useMemo(() => {
    const maxRow = Math.max(...tables.map((t) => t.row)) + 1
    const maxCol = Math.max(...tables.map((t) => t.col)) + 1

    const groups: TableGroup[] = []
    const processed = new Set<number>()

    for (const table of tables) {
      if (processed.has(table.id)) continue

      if (table.mergedWith.length > 0) {
        const groupMembers = [table.id, ...table.mergedWith]
        const memberTables = tables.filter((t) => groupMembers.includes(t.id))
        const totalCapacity = memberTables.reduce((sum, t) => sum + t.capacity, 0)
        const isOccupied = memberTables.every((t) => t.occupied)

        const minRow = Math.min(...memberTables.map((t) => t.row))
        const maxRowOfGroup = Math.max(...memberTables.map((t) => t.row))
        const minCol = Math.min(...memberTables.map((t) => t.col))
        const maxColOfGroup = Math.max(...memberTables.map((t) => t.col))

        groups.push({
          id: table.id,
          members: groupMembers,
          totalCapacity,
          isOccupied,
          isMerged: true,
          row: minRow,
          col: minCol,
          rowSpan: maxRowOfGroup - minRow + 1,
          colSpan: maxColOfGroup - minCol + 1,
        })
        groupMembers.forEach((id) => processed.add(id))
      } else {
        groups.push({
          id: table.id,
          members: [table.id],
          totalCapacity: table.capacity,
          isOccupied: table.occupied,
          isMerged: false,
          row: table.row,
          col: table.col,
          rowSpan: 1,
          colSpan: 1,
        })
        processed.add(table.id)
      }
    }

    return { gridRows: maxRow, gridCols: maxCol, tableGroups: groups }
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

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        桌台状态 (物理布局)
      </h2>
      <div className="grid gap-4" style={gridStyle}>
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
            style={{
              gridRow: `${group.row + 1} / span ${group.rowSpan}`,
              gridColumn: `${group.col + 1} / span ${group.colSpan}`,
            }}
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

            <div className="absolute bottom-1 right-1 text-xs text-gray-400">
              ({group.row + 1},{group.col + 1})
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
