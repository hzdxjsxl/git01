import { useMemo, useEffect, useState } from 'react'
import type { Table as TableType } from '@/utils/greedyMatch'

interface TableGridProps {
  tables: TableType[]
  highlightedTables: number[]
  onTableClick?: (tableId: number) => void
}

interface CellPosition {
  row: number
  col: number
}

interface MergedGroup {
  ids: number[]
  tables: TableType[]
  positions: CellPosition[]
  boundingBox: { minRow: number; maxRow: number; minCol: number; maxCol: number }
  totalCapacity: number
  isHighlighted: boolean
  isOccupied: boolean
  isPreviouslyMerged: boolean
}

export default function TableGrid({
  tables,
  highlightedTables,
  onTableClick,
}: TableGridProps) {
  const [animating, setAnimating] = useState(false)

  const { gridRows, gridCols, displayCells, mergedGroups } = useMemo(() => {
    const maxRow = Math.max(...tables.map((t) => t.row)) + 1
    const maxCol = Math.max(...tables.map((t) => t.col)) + 1

    const highlightedSet = new Set(highlightedTables)
    const processed = new Set<number>()
    const groups: MergedGroup[] = []
    const cells: { table: TableType; isHighlighted: boolean; isPartOfMerge: boolean }[] = []

    for (const table of tables) {
      if (processed.has(table.id)) continue

      const isHighlighted = highlightedSet.has(table.id)
      const isPreviouslyMerged = table.mergedWith.length > 0

      if ((isHighlighted && !isPreviouslyMerged) || isPreviouslyMerged) {
        let groupTables: TableType[] = []
        let groupIds: Set<number>

        if (isHighlighted) {
          groupTables = [table]
          groupIds = new Set<number>([table.id])
          let changed = true

          while (changed) {
            changed = false
            for (const otherTable of tables) {
              if (groupIds.has(otherTable.id) || !highlightedSet.has(otherTable.id)) continue

              const isAdjacent = groupTables.some(gt => {
                const rowDiff = Math.abs(gt.row - otherTable.row)
                const colDiff = Math.abs(gt.col - otherTable.col)
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
              })

              if (isAdjacent) {
                groupTables.push(otherTable)
                groupIds.add(otherTable.id)
                changed = true
              }
            }
          }
        } else {
          const groupMembers = [table.id, ...table.mergedWith]
          groupTables = tables.filter((t) => groupMembers.includes(t.id))
          groupIds = new Set(groupMembers)
        }

        const memberTables = groupTables
        const totalCapacity = memberTables.reduce((sum, t) => sum + t.capacity, 0)
        const isOccupied = memberTables.every((t) => t.occupied)
        const positions = memberTables.map(t => ({ row: t.row, col: t.col }))
        const minRow = Math.min(...positions.map(p => p.row))
        const maxRow = Math.max(...positions.map(p => p.row))
        const minCol = Math.min(...positions.map(p => p.col))
        const maxCol = Math.max(...positions.map(p => p.col))

        groups.push({
          ids: Array.from(groupIds),
          tables: memberTables,
          positions,
          boundingBox: { minRow, maxRow, minCol, maxCol },
          totalCapacity,
          isHighlighted: isHighlighted || Array.from(groupIds).some(id => highlightedSet.has(id)),
          isOccupied,
          isPreviouslyMerged,
        })
        groupIds.forEach((id) => processed.add(id))
      } else {
        cells.push({ 
          table, 
          isHighlighted: false, 
          isPartOfMerge: false 
        })
        processed.add(table.id)
      }
    }

    return { 
      gridRows: maxRow, 
      gridCols: maxCol, 
      displayCells: cells, 
      mergedGroups: groups 
    }
  }, [tables, highlightedTables])

  useEffect(() => {
    if (highlightedTables.length > 0) {
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [highlightedTables])

  const getStatusStyle = (isOccupied: boolean, isHighlighted: boolean, isMerged: boolean) => {
    if (isHighlighted) {
      return {
        bg: 'bg-gradient-to-br from-amber-300 to-amber-400',
        border: 'border-3 border-amber-500',
        shadow: 'shadow-2xl shadow-amber-400/60',
        textColor: 'text-amber-900'
      }
    }
    if (isOccupied) {
      return {
        bg: 'bg-red-50',
        border: 'border-2 border-red-200',
        shadow: '',
        textColor: 'text-red-700'
      }
    }
    if (isMerged) {
      return {
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-2 border-blue-400',
        shadow: 'shadow-md shadow-blue-200/50',
        textColor: 'text-blue-700'
      }
    }
    return {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-2 border-green-200',
      shadow: '',
      textColor: 'text-green-700'
    }
  }

  const getStatusLabel = (isOccupied: boolean, isHighlighted: boolean, isMerged: boolean) => {
    if (isHighlighted) return '推荐合并'
    if (isOccupied) return '已占用'
    if (isMerged) return '已合并'
    return '空闲'
  }

  const getStatusBadgeStyle = (isOccupied: boolean, isHighlighted: boolean, isMerged: boolean) => {
    if (isHighlighted) return 'bg-amber-500 text-white'
    if (isOccupied) return 'bg-red-200 text-red-700'
    if (isMerged) return 'bg-blue-200 text-blue-700'
    return 'bg-green-200 text-green-700'
  }

  const cellSize = 140
  const cellGap = 12
  const padding = 16

  const gridWidth = gridCols * cellSize + (gridCols - 1) * cellGap + padding * 2
  const gridHeight = gridRows * cellSize + (gridRows - 1) * cellGap + padding * 2

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        桌台状态 (物理布局)
      </h2>
      
      <div 
        className="relative mx-auto bg-gray-100 rounded-xl overflow-hidden"
        style={{ width: gridWidth, height: gridHeight }}
      >
        <div 
          className="absolute inset-0 p-4"
          style={{ padding }}
        >
          <div 
            className="relative w-full h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
              gap: cellGap
            }}
          >
            {displayCells.map(({ table, isHighlighted, isPartOfMerge }) => {
              const style = getStatusStyle(table.occupied, isHighlighted, isPartOfMerge)
              
              return (
                <div
                  key={table.id}
                  onClick={() => onTableClick?.(table.id)}
                  className={`
                    relative rounded-xl cursor-pointer
                    transition-all duration-500 ease-out
                    hover:scale-105 hover:shadow-lg
                    ${style.bg} ${style.border} ${style.shadow}
                  `}
                  style={{
                    gridRow: table.row + 1,
                    gridColumn: table.col + 1,
                  }}
                >
                  <div className="absolute inset-0 p-3 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold text-gray-700">
                        {table.id} 号桌
                      </div>
                      <div className={`text-3xl font-bold ${style.textColor}`}>
                        {table.capacity}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">座位容量</div>
                        <div className={`text-lg font-bold ${style.textColor}`}>
                          {table.capacity} 人
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeStyle(table.occupied, isHighlighted, isPartOfMerge)}`}>
                        {getStatusLabel(table.occupied, isHighlighted, isPartOfMerge)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({table.row + 1},{table.col + 1})
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {mergedGroups.map((group, index) => {
            const style = getStatusStyle(group.isOccupied, group.isHighlighted, group.isPreviouslyMerged)
            const { minRow, maxRow, minCol, maxCol } = group.boundingBox
            
            const left = padding + minCol * (cellSize + cellGap)
            const top = padding + minRow * (cellSize + cellGap)
            const width = (maxCol - minCol + 1) * cellSize + (maxCol - minCol) * cellGap
            const height = (maxRow - minRow + 1) * cellSize + (maxRow - minRow) * cellGap

            return (
              <div
                key={`merged-${index}`}
                onClick={() => onTableClick?.(group.ids[0])}
                className={`
                  absolute rounded-xl cursor-pointer
                  transition-all duration-500 ease-out
                  hover:shadow-2xl
                  ${style.bg} ${style.border} ${style.shadow}
                  ${animating && group.isHighlighted ? 'scale-105' : ''}
                `}
                style={{
                  left,
                  top,
                  width,
                  height,
                  zIndex: group.isHighlighted ? 30 : 20,
                }}
              >
                {group.isHighlighted && !group.isPreviouslyMerged && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-white bg-amber-500 rounded-full shadow-lg whitespace-nowrap animate-bounce">
                    ✨ 智能合并推荐
                  </div>
                )}
                {group.isPreviouslyMerged && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-white bg-blue-500 rounded-full shadow-lg whitespace-nowrap">
                    🔗 已合并桌台
                  </div>
                )}

                <div className="absolute inset-0 p-4 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold text-gray-700">
                      {group.ids.join(' + ')} 号桌
                    </div>
                    <div className={`text-4xl font-bold ${style.textColor}`}>
                      {group.totalCapacity}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">合并 {group.ids.length} 张桌台</div>
                      <div className={`text-2xl font-bold ${style.textColor}`}>
                        {group.totalCapacity} 人容量
                      </div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {group.tables.map((t) => (
                          <span 
                            key={t.id} 
                            className="px-2 py-0.5 text-xs bg-white/80 rounded shadow-sm"
                          >
                            {t.id}号({t.capacity}人)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeStyle(group.isOccupied, group.isHighlighted, group.isPreviouslyMerged)}`}>
                      {getStatusLabel(group.isOccupied, group.isHighlighted, group.isPreviouslyMerged)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({minRow + 1}-{maxRow + 1},{minCol + 1}-{maxCol + 1})
                    </span>
                  </div>
                </div>

                {group.isHighlighted && (
                  <div className="absolute inset-0 rounded-xl border-4 border-amber-400 border-dashed animate-pulse pointer-events-none" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {highlightedTables.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            当前推荐合并: {highlightedTables.length} 张桌台 (共 {mergedGroups.find(g => g.isHighlighted)?.totalCapacity || 0} 人容量)
          </div>
        </div>
      )}
    </div>
  )
}
