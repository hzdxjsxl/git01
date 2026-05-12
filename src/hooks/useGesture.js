import { useCallback, useRef, useEffect } from 'react'

export function useGesture({ onStart, onMove, onEnd }) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const positionHistory = useRef([])
  const timeHistory = useRef([])
  const lastPoint = useRef({ x: 0, y: 0 })

  const getPoint = useCallback((e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }, [])

  const doMove = useCallback((e) => {
    if (!isDragging.current) return
    
    const point = getPoint(e)
    lastPoint.current = point
    
    const deltaX = point.x - startX.current
    const deltaY = point.y - startY.current
    
    const now = performance.now()
    const lastTime = timeHistory.current[timeHistory.current.length - 1]
    if (!lastTime || now - lastTime >= 5) {
      positionHistory.current.push(deltaX)
      timeHistory.current.push(now)
      
      if (positionHistory.current.length > 15) {
        positionHistory.current.shift()
        timeHistory.current.shift()
      }
    }
    
    if (onMove) {
      onMove(deltaX, deltaY)
    }
  }, [getPoint, onMove])

  const doEnd = useCallback((e) => {
    if (!isDragging.current) return
    
    isDragging.current = false
    
    const point = getPoint(e)
    const deltaX = point.x - startX.current
    const deltaY = point.y - startY.current
    
    const lastPos = positionHistory.current[positionHistory.current.length - 1]
    if (lastPos !== deltaX) {
      positionHistory.current.push(deltaX)
      timeHistory.current.push(performance.now())
    }
    
    const finalHistory = [...positionHistory.current]
    const finalTimes = [...timeHistory.current]
    
    positionHistory.current = []
    timeHistory.current = []
    
    if (onEnd) {
      onEnd(deltaX, deltaY, finalHistory, finalTimes)
    }
  }, [getPoint, onEnd])

  const handleStart = useCallback((e) => {
    isDragging.current = true
    const point = getPoint(e)
    startX.current = point.x
    startY.current = point.y
    lastPoint.current = point
    positionHistory.current = [0]
    timeHistory.current = [performance.now()]
    
    if (onStart) {
      onStart()
    }
  }, [getPoint, onStart])

  useEffect(() => {
    const onGlobalMove = (e) => doMove(e)
    const onGlobalUp = (e) => doEnd(e)
    
    document.addEventListener('mousemove', onGlobalMove)
    document.addEventListener('mouseup', onGlobalUp)
    document.addEventListener('touchmove', onGlobalMove, { passive: false })
    document.addEventListener('touchend', onGlobalUp)
    
    return () => {
      document.removeEventListener('mousemove', onGlobalMove)
      document.removeEventListener('mouseup', onGlobalUp)
      document.removeEventListener('touchmove', onGlobalMove)
      document.removeEventListener('touchend', onGlobalUp)
    }
  }, [doMove, doEnd])

  return {
    handleStart,
    isDragging: () => isDragging.current
  }
}
