import { useCallback, useRef, useState, useEffect } from 'react'
import { PhysicsEngine, calculateVelocity, clamp } from '../utils/physics'

export function useCarouselState(itemCount, config = {}) {
  const { 
    itemWidth = 300, 
    gap = 40,
    velocityMultiplier = 0.8,
    snapThreshold = 0.3
  } = config

  const totalWidth = itemWidth + gap
  const maxOffset = 0
  const minOffset = -(itemCount - 1) * totalWidth

  const [offset, setOffset] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const physicsRef = useRef(new PhysicsEngine({
    friction: 0.96,
    bounceDamping: 0.6,
    springStiffness: 0.08
  }))
  
  const dragStartOffset = useRef(0)
  const animationFrame = useRef(null)

  const stopAnimation = useCallback(() => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
  }, [])

  const snapToNearest = useCallback(() => {
    const currentOffset = physicsRef.current.position
    const rawIndex = -currentOffset / totalWidth
    const snappedIndex = Math.round(rawIndex)
    const targetIndex = clamp(snappedIndex, 0, itemCount - 1)
    const targetOffset = -targetIndex * totalWidth
    
    const currentVelocity = physicsRef.current.velocity
    
    physicsRef.current.setPosition(currentOffset)
    physicsRef.current.setBounds(minOffset, maxOffset)
    
    const distance = targetOffset - currentOffset
    const newVelocity = Math.abs(distance) * 0.15
    
    physicsRef.current.setVelocity(
      distance > 0 ? Math.max(newVelocity, currentVelocity * 0.3) : Math.min(-newVelocity, currentVelocity * 0.3)
    )

    setCurrentIndex(targetIndex)
    
    const animate = () => {
      const hasMore = physicsRef.current.update()
      setOffset(physicsRef.current.position)
      
      if (hasMore) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        setOffset(targetOffset)
        physicsRef.current.setPosition(targetOffset)
        physicsRef.current.setVelocity(0)
      }
    }
    
    stopAnimation()
    animationFrame.current = requestAnimationFrame(animate)
  }, [itemCount, totalWidth, minOffset, maxOffset, stopAnimation])

  const handleDragStart = useCallback(() => {
    stopAnimation()
    dragStartOffset.current = offset
    setIsDragging(true)
  }, [offset, stopAnimation])

  const handleDragMove = useCallback((deltaX) => {
    const rawNewOffset = dragStartOffset.current + deltaX
    let newOffset = rawNewOffset

    if (rawNewOffset > maxOffset) {
      const overshoot = rawNewOffset - maxOffset
      newOffset = maxOffset + overshoot * 0.3
    } else if (rawNewOffset < minOffset) {
      const overshoot = rawNewOffset - minOffset
      newOffset = minOffset + overshoot * 0.3
    }

    setOffset(newOffset)
  }, [maxOffset, minOffset])

  const handleDragEnd = useCallback((deltaX, _, positionHistory, timeHistory) => {
    setIsDragging(false)
    
    const velocity = calculateVelocity(positionHistory, timeHistory) * velocityMultiplier
    
    physicsRef.current.setPosition(offset)
    physicsRef.current.setVelocity(velocity)
    physicsRef.current.setBounds(minOffset, maxOffset)

    if (Math.abs(velocity) < 0.5) {
      snapToNearest()
      return
    }

    const animate = () => {
      const hasMore = physicsRef.current.update()
      setOffset(physicsRef.current.position)
      
      if (hasMore) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        snapToNearest()
      }
    }
    
    animationFrame.current = requestAnimationFrame(animate)
  }, [offset, minOffset, maxOffset, velocityMultiplier, snapToNearest])

  const goTo = useCallback((index) => {
    stopAnimation()
    const targetIndex = clamp(index, 0, itemCount - 1)
    const targetOffset = -targetIndex * totalWidth
    
    physicsRef.current.setPosition(offset)
    physicsRef.current.setBounds(minOffset, maxOffset)
    
    const distance = targetOffset - offset
    physicsRef.current.setVelocity(distance * 0.1)
    setCurrentIndex(targetIndex)
    
    const animate = () => {
      const hasMore = physicsRef.current.update()
      setOffset(physicsRef.current.position)
      
      if (hasMore) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        setOffset(targetOffset)
        physicsRef.current.setPosition(targetOffset)
        physicsRef.current.setVelocity(0)
      }
    }
    
    animationFrame.current = requestAnimationFrame(animate)
  }, [itemCount, totalWidth, offset, minOffset, maxOffset, stopAnimation])

  const next = useCallback(() => {
    goTo(currentIndex + 1)
  }, [currentIndex, goTo])

  const prev = useCallback(() => {
    goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  useEffect(() => {
    return () => stopAnimation()
  }, [stopAnimation])

  return {
    offset,
    currentIndex,
    isDragging,
    itemWidth,
    gap,
    totalWidth,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    goTo,
    next,
    prev
  }
}
