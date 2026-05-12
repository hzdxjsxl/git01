import { useCallback, useRef } from 'react'

export function useGesture({ onStart, onMove, onEnd }) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const positionHistory = useRef([])
  const timeHistory = useRef([])

  const getPoint = useCallback((e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }, [])

  const handleStart = useCallback((e) => {
    isDragging.current = true
    const point = getPoint(e)
    startX.current = point.x
    startY.current = point.y
    positionHistory.current = [0]
    timeHistory.current = [Date.now()]
    
    if (onStart) {
      onStart()
    }
  }, [getPoint, onStart])

  const handleMove = useCallback((e) => {
    if (!isDragging.current) return
    
    e.preventDefault()
    const point = getPoint(e)
    const deltaX = point.x - startX.current
    const deltaY = point.y - startY.current
    
    positionHistory.current.push(deltaX)
    timeHistory.current.push(Date.now())
    
    if (positionHistory.current.length > 10) {
      positionHistory.current.shift()
      timeHistory.current.shift()
    }
    
    if (onMove) {
      onMove(deltaX, deltaY)
    }
  }, [getPoint, onMove])

  const handleEnd = useCallback((e) => {
    if (!isDragging.current) return
    
    isDragging.current = false
    const point = getPoint(e)
    const deltaX = point.x - startX.current
    const deltaY = point.y - startY.current
    
    if (onEnd) {
      onEnd(deltaX, deltaY, positionHistory.current, timeHistory.current)
    }
    
    positionHistory.current = []
    timeHistory.current = []
  }, [getPoint, onEnd])

  return {
    handleStart,
    handleMove,
    handleEnd,
    isDragging: () => isDragging.current
  }
}
