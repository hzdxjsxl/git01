export interface Table {
  id: number
  capacity: number
  occupied: boolean
  mergedWith: number[]
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

  const combinations = findTableCombinations(availableTables, peopleCount)

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

function findTableCombinations(
  tables: Table[],
  targetCapacity: number
): Table[][] {
  const results: Table[][] = []

  function backtrack(start: number, current: Table[], currentCapacity: number) {
    if (currentCapacity >= targetCapacity) {
      results.push([...current])
      return
    }

    if (current.length >= 4) {
      return
    }

    for (let i = start; i < tables.length; i++) {
      const table = tables[i]
      current.push(table)
      backtrack(i + 1, current, currentCapacity + table.capacity)
      current.pop()
    }
  }

  backtrack(0, [], 0)
  return results
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

  const combinations = findTableCombinations(emptyTables, peopleCount)
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
