import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const BOARD_WIDTH = 80
export const BOARD_HEIGHT = 60
const MAX_HISTORY = 100

class HistoryNode {
  constructor(changes, prev = null) {
    this.changes = changes
    this.prev = prev
    this.next = null
    this.branches = []
    this.id = Math.random().toString(36).slice(2, 9)
  }
}

export const useBoardStore = defineStore('board', () => {
  const pixels = ref(new Uint32Array(BOARD_WIDTH * BOARD_HEIGHT))
  const currentColor = ref(0xFF000000)
  const connected = ref(false)
  const ws = ref(null)
  const version = ref(0)

  let historyHead = null
  let historyCurrent = null
  const historyRoot = new HistoryNode([])
  historyHead = historyRoot
  historyCurrent = historyRoot

  const canUndo = computed(() => historyCurrent !== historyRoot)
  const canRedo = computed(() => {
    if (historyCurrent.next) return true
    return historyCurrent.branches.length > 0
  })

  const availableBranches = computed(() => {
    if (historyCurrent === historyRoot) return []
    return historyCurrent.next
      ? [{ id: 'main', changes: historyCurrent.next.changes }]
      : historyCurrent.branches.map((b, i) => ({ id: `branch-${i}`, changes: b.changes }))
  })

  function hexToUint32(hex) {
    const h = hex.replace('#', '')
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      return (0xFF << 24) | (b << 16) | (g << 8) | r
    }
    return 0xFF000000
  }

  function setColorFromHex(hex) {
    currentColor.value = hexToUint32(hex)
  }

  function getPixel(x, y) {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return 0
    return pixels.value[y * BOARD_WIDTH + x]
  }

  function applyChanges(changes, recordRemote = false) {
    const revertChanges = []
    for (const { x, y, color } of changes) {
      const idx = y * BOARD_WIDTH + x
      if (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT) {
        const oldColor = pixels.value[idx]
        revertChanges.push({ x, y, color: oldColor })
        pixels.value[idx] = color
      }
    }
    version.value++
    return revertChanges
  }

  function pushHistory(changes, revertChanges) {
    const node = new HistoryNode({ changes, revertChanges }, historyCurrent)
    if (historyCurrent.next) {
      historyCurrent.branches.push(historyCurrent.next)
    }
    historyCurrent.next = node
    historyCurrent = node
    historyHead = node

    let count = 0
    let cursor = historyCurrent
    while (cursor.prev) {
      count++
      cursor = cursor.prev
    }
    if (count > MAX_HISTORY) {
      historyRoot.next = historyRoot.next?.next || null
      if (historyRoot.next) historyRoot.next.prev = historyRoot
    }
  }

  function setPixel(x, y, color, broadcast = true) {
    const idx = y * BOARD_WIDTH + x
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return
    if (pixels.value[idx] === color) return

    const oldColor = pixels.value[idx]
    pixels.value[idx] = color

    pushHistory(
      [{ x, y, color }],
      [{ x, y, color: oldColor }]
    )

    if (broadcast && ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify([{ x, y, color }]))
    }
  }

  function remoteApplyChanges(changes) {
    applyChanges(changes, false)
  }

  function undo() {
    if (!canUndo.value) return
    const { revertChanges } = historyCurrent.changes
    applyChanges(revertChanges, false)
    historyCurrent = historyCurrent.prev
  }

  function redo() {
    if (historyCurrent.next) {
      const { changes } = historyCurrent.next.changes
      applyChanges(changes, false)
      historyCurrent = historyCurrent.next
    } else if (historyCurrent.branches.length > 0) {
      const branch = historyCurrent.branches.shift()
      historyCurrent.next = branch
      const { changes } = branch.changes
      applyChanges(changes, false)
      historyCurrent = branch
      historyHead = branch
    }
  }

  function connect() {
    if (ws.value) return
    const socket = new WebSocket('ws://localhost:3001')
    socket.onopen = () => { connected.value = true }
    socket.onclose = () => { connected.value = false }
    socket.onerror = () => { connected.value = false }
    socket.onmessage = (event) => {
      try {
        const changes = JSON.parse(event.data)
        if (Array.isArray(changes)) {
          remoteApplyChanges(changes)
        }
      } catch (e) {}
    }
    ws.value = socket
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connected.value = false
  }

  return {
    pixels,
    currentColor,
    connected,
    version,
    canUndo,
    canRedo,
    availableBranches,
    setColorFromHex,
    getPixel,
    setPixel,
    remoteApplyChanges,
    undo,
    redo,
    connect,
    disconnect,
    BOARD_WIDTH,
    BOARD_HEIGHT
  }
})
