import express, { type Request, type Response } from 'express'

const router = express.Router()

interface Table {
  id: number
  capacity: number
  occupied: boolean
  mergedWith: number[]
  row: number
  col: number
}

interface QueueItem {
  number: number
  peopleCount: number
  waitTime: number
}

interface RestaurantStatus {
  tables: Table[]
  queue: QueueItem[]
  emptyTables: number
  totalCapacity: number
}

const initialTables: Table[] = [
  { id: 1, capacity: 2, occupied: false, mergedWith: [], row: 0, col: 0 },
  { id: 2, capacity: 2, occupied: false, mergedWith: [], row: 0, col: 1 },
  { id: 3, capacity: 2, occupied: true, mergedWith: [], row: 0, col: 2 },
  { id: 4, capacity: 2, occupied: false, mergedWith: [], row: 0, col: 3 },
  { id: 5, capacity: 2, occupied: false, mergedWith: [], row: 1, col: 0 },
  { id: 6, capacity: 3, occupied: false, mergedWith: [], row: 1, col: 1 },
  { id: 7, capacity: 3, occupied: true, mergedWith: [], row: 1, col: 2 },
  { id: 8, capacity: 3, occupied: false, mergedWith: [], row: 1, col: 3 },
  { id: 9, capacity: 3, occupied: false, mergedWith: [], row: 2, col: 0 },
  { id: 10, capacity: 4, occupied: false, mergedWith: [], row: 2, col: 1 },
  { id: 11, capacity: 4, occupied: true, mergedWith: [], row: 2, col: 2 },
  { id: 12, capacity: 4, occupied: false, mergedWith: [], row: 2, col: 3 },
]

let currentTables = [...initialTables]

const initialQueue: QueueItem[] = [
  { number: 101, peopleCount: 2, waitTime: 5 },
  { number: 102, peopleCount: 4, waitTime: 12 },
  { number: 103, peopleCount: 6, waitTime: 20 },
  { number: 104, peopleCount: 3, waitTime: 8 },
  { number: 105, peopleCount: 2, waitTime: 3 },
]

let currentQueue = [...initialQueue]

const getEmptyTables = (): number => {
  return currentTables.filter((t) => !t.occupied).length
}

const getTotalCapacity = (): number => {
  return currentTables.reduce((sum, t) => sum + t.capacity, 0)
}

router.get('/status', (req: Request, res: Response) => {
  const status: RestaurantStatus = {
    tables: currentTables,
    queue: currentQueue,
    emptyTables: getEmptyTables(),
    totalCapacity: getTotalCapacity(),
  }
  res.json(status)
})

router.post('/assign', (req: Request, res: Response) => {
  const { queueNumber, tableIds } = req.body

  const queueItem = currentQueue.find((q) => q.number === queueNumber)
  if (!queueItem) {
    return res.status(404).json({ success: false, message: 'Queue number not found' })
  }

  for (const tableId of tableIds) {
    const table = currentTables.find((t) => t.id === tableId)
    if (table) {
      table.occupied = true
      table.mergedWith = tableIds.filter((id: number) => id !== tableId)
    }
  }

  currentQueue = currentQueue.filter((q) => q.number !== queueNumber)

  res.json({
    success: true,
    message: 'Tables assigned successfully',
    status: {
      tables: currentTables,
      queue: currentQueue,
      emptyTables: getEmptyTables(),
      totalCapacity: getTotalCapacity(),
    },
  })
})

router.post('/release', (req: Request, res: Response) => {
  const { tableIds } = req.body

  for (const tableId of tableIds) {
    const table = currentTables.find((t) => t.id === tableId)
    if (table) {
      table.occupied = false
      table.mergedWith = []
    }
  }

  res.json({
    success: true,
    message: 'Tables released successfully',
    status: {
      tables: currentTables,
      queue: currentQueue,
      emptyTables: getEmptyTables(),
      totalCapacity: getTotalCapacity(),
    },
  })
})

router.post('/reset', (req: Request, res: Response) => {
  currentTables = initialTables.map((t) => ({ ...t, mergedWith: [] }))
  currentQueue = [...initialQueue]

  res.json({
    success: true,
    message: 'Data reset successfully',
    status: {
      tables: currentTables,
      queue: currentQueue,
      emptyTables: getEmptyTables(),
      totalCapacity: getTotalCapacity(),
    },
  })
})

export default router
