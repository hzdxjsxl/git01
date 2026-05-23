export interface Table {
  id: number
  capacity: number
  occupied: boolean
  mergedWith: number[]
  row: number
  col: number
}

export interface QueueItem {
  number: number
  peopleCount: number
  waitTime: number
}

export interface AssignmentResult {
  queueNumber: number
  peopleCount: number
  tableIds: number[]
  totalCapacity: number
  isMerged: boolean
  mergedGroups: number[][]
}

export interface AlgorithmOutput {
  assignments: AssignmentResult[]
  unassigned: QueueItem[]
  updatedTables: Table[]
}

function areAdjacent(table1: Table, table2: Table): boolean {
  const rowDiff = Math.abs(table1.row - table2.row)
  const colDiff = Math.abs(table1.col - table2.col)
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
}

function isContiguousGroup(tables: Table[]): boolean {
  if (tables.length <= 1) return true

  const visited = new Set<number>()
  const queue: Table[] = [tables[0]]
  visited.add(tables[0].id)

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const table of tables) {
      if (!visited.has(table.id) && areAdjacent(current, table)) {
        visited.add(table.id)
        queue.push(table)
      }
    }
  }

  return visited.size === tables.length
}

function findAdjacentTables(
  table: Table,
  allTables: Table[],
  excludeIds: Set<number>
): Table[] {
  return allTables.filter(
    (t) => !excludeIds.has(t.id) && areAdjacent(table, t)
  )
}

export function greedyMatchAlgorithm(
  tables: Table[],
  queue: QueueItem[]
): AlgorithmOutput {
  const emptyTables = tables
    .filter((t) => !t.occupied)
    .sort((a, b) => a.capacity - b.capacity)

  const sortedQueue = [...queue].sort((a, b) => b.peopleCount - a.peopleCount)

  const assignments: AssignmentResult[] = []
  const unassigned: QueueItem[] = []
  const usedTableIds = new Set<number>()

  for (const queueItem of sortedQueue) {
    const { number, peopleCount } = queueItem

    let foundAssignment = findSingleTableAssignment(
      emptyTables,
      usedTableIds,
      number,
      peopleCount
    )

    if (!foundAssignment) {
      foundAssignment = findMergedTableAssignment(
        emptyTables,
        usedTableIds,
        number,
        peopleCount
      )
    }

    if (foundAssignment) {
      assignments.push(foundAssignment)
      foundAssignment.tableIds.forEach((id) => usedTableIds.add(id))
    } else {
      unassigned.push(queueItem)
    }
  }

  const updatedTables = tables.map((table) => {
    if (usedTableIds.has(table.id)) {
      const assignment = assignments.find((a) => a.tableIds.includes(table.id))
      if (assignment) {
        return {
          ...table,
          occupied: true,
          mergedWith: assignment.tableIds.filter((id) => id !== table.id),
        }
      }
    }
    return table
  })

  return {
    assignments,
    unassigned,
    updatedTables,
  }
}

function findSingleTableAssignment(
  emptyTables: Table[],
  usedTableIds: Set<number>,
  queueNumber: number,
  peopleCount: number
): AssignmentResult | null {
  const availableTable = emptyTables.find(
    (t) => !usedTableIds.has(t.id) && t.capacity >= peopleCount
  )

  if (availableTable) {
    return {
      queueNumber,
      peopleCount,
      tableIds: [availableTable.id],
      totalCapacity: availableTable.capacity,
      isMerged: false,
      mergedGroups: [],
    }
  }

  return null
}

function findMergedTableAssignment(
  emptyTables: Table[],
  usedTableIds: Set<number>,
  queueNumber: number,
  peopleCount: number
): AssignmentResult | null {
  const availableTables = emptyTables.filter((t) => !usedTableIds.has(t.id))

  const combinations = findAdjacentTableCombinations(availableTables, peopleCount)

  if (combinations.length === 0) {
    return null
  }

  combinations.sort((a, b) => {
    const capacityA = a.reduce((sum, t) => sum + t.capacity, 0)
    const capacityB = b.reduce((sum, t) => sum + t.capacity, 0)
    const diffA = capacityA - peopleCount
    const diffB = capacityB - peopleCount
    if (diffA !== diffB) return diffA - diffB
    return a.length - b.length
  })

  const bestCombination = combinations[0]
  const totalCapacity = bestCombination.reduce((sum, t) => sum + t.capacity, 0)

  return {
    queueNumber,
    peopleCount,
    tableIds: bestCombination.map((t) => t.id),
    totalCapacity,
    isMerged: true,
    mergedGroups: [bestCombination.map((t) => t.id)],
  }
}

function findAdjacentTableCombinations(
  tables: Table[],
  targetCapacity: number
): Table[][] {
  const results: Table[][] = []

  function backtrack(
    current: Table[],
    currentCapacity: number,
    visitedIds: Set<number>
  ) {
    if (currentCapacity >= targetCapacity) {
      results.push([...current])
      return
    }

    if (current.length >= 4) {
      return
    }

    const lastTable = current[current.length - 1]
    const adjacentTables = findAdjacentTables(lastTable, tables, visitedIds)

    for (const adjacentTable of adjacentTables) {
      const newVisited = new Set(visitedIds)
      newVisited.add(adjacentTable.id)
      current.push(adjacentTable)
      backtrack(current, currentCapacity + adjacentTable.capacity, newVisited)
      current.pop()
    }
  }

  for (const startTable of tables) {
    const visited = new Set<number>()
    visited.add(startTable.id)
    backtrack([startTable], startTable.capacity, visited)
  }

  return results.filter((combo) => isContiguousGroup(combo))
}

export function calculateOptimalMerge(
  tables: Table[],
  peopleCount: number
): Table[] | null {
  const emptyTables = tables.filter((t) => !t.occupied)

  const singleTable = emptyTables.find((t) => t.capacity >= peopleCount)
  if (singleTable) {
    return [singleTable]
  }

  const combinations = findAdjacentTableCombinations(emptyTables, peopleCount)
  if (combinations.length === 0) {
    return null
  }

  combinations.sort((a, b) => {
    const capacityA = a.reduce((sum, t) => sum + t.capacity, 0)
    const capacityB = b.reduce((sum, t) => sum + t.capacity, 0)
    const diffA = capacityA - peopleCount
    const diffB = capacityB - peopleCount
    if (diffA !== diffB) return diffA - diffB
    return a.length - b.length
  })

  return combinations[0]
}

export function getTableGroups(tables: Table[]): Map<number, number[]> {
  const groups = new Map<number, number[]>()
  const processed = new Set<number>()

  for (const table of tables) {
    if (processed.has(table.id)) continue

    if (table.mergedWith.length > 0) {
      const groupId = table.id
      const groupMembers = [table.id, ...table.mergedWith]
      groups.set(groupId, groupMembers)
      groupMembers.forEach((id) => processed.add(id))
    } else {
      groups.set(table.id, [table.id])
      processed.add(table.id)
    }
  }

  return groups
}

export function getAdjacencyInfo(tables: Table[]): Map<number, number[]> {
  const adjacency = new Map<number, number[]>()

  for (const table of tables) {
    const neighbors = tables
      .filter((t) => t.id !== table.id && areAdjacent(table, t))
      .map((t) => t.id)
    adjacency.set(table.id, neighbors)
  }

  return adjacency
}
