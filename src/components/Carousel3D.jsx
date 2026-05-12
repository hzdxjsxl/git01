import { useMemo } from 'react'
import { useCarouselState } from '../hooks/useCarouselState'
import { useGesture } from '../hooks/useGesture'
import { clamp } from '../utils/physics'

export function Carousel3D({ items, itemWidth = 300, gap = 40 }) {
  const {
    offset,
    currentIndex,
    isDragging,
    totalWidth,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    goTo,
    next,
    prev
  } = useCarouselState(items.length, { itemWidth, gap })

  const { handleStart } = useGesture({
    onStart: handleDragStart,
    onMove: handleDragMove,
    onEnd: handleDragEnd
  })

  const itemStyles = useMemo(() => {
    return items.map((_, index) => {
      const itemCenter = index * totalWidth
      const containerCenter = -offset + itemWidth / 2
      const distance = itemCenter - (-offset)
      
      const normalizedDistance = distance / totalWidth
      const absDistance = Math.abs(normalizedDistance)
      
      const rotateY = clamp(-normalizedDistance * 45, -45, 45)
      
      const maxZ = 300
      const zOffset = -absDistance * maxZ
      
      const maxScale = 1
      const minScale = 0.7
      const scale = maxScale - absDistance * (maxScale - minScale) * 0.6
      
      const maxOpacity = 1
      const minOpacity = 0.4
      const opacity = maxOpacity - absDistance * (maxOpacity - minOpacity) * 0.5
      
      const xOffset = distance
      
      return {
        x: xOffset,
        y: 0,
        z: zOffset,
        rotateY,
        scale: clamp(scale, minScale, maxScale),
        opacity: clamp(opacity, minOpacity, maxOpacity),
        zIndex: 1000 - Math.floor(absDistance * 100)
      }
    })
  }, [offset, items.length, totalWidth, itemWidth])

  return (
    <div className="carousel-3d-wrapper">
      <div className="carousel-title">
        <h2>3D 轮播图</h2>
        <p className="carousel-subtitle">拖拽滑动 • 物理惯性 • 边界回弹</p>
      </div>
      
      <div className="carousel-3d-container">
        <div 
          className="carousel-3d-stage"
          style={{
            perspective: '1200px',
            perspectiveOrigin: '50% 50%'
          }}
        >
          <div
            className="carousel-3d-track"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div 
              className="carousel-3d-items"
              style={{
                transformStyle: 'preserve-3d',
                transform: `translate3d(${-offset}px, 0, 0)`
              }}
            >
              {items.map((item, index) => {
                const style = itemStyles[index]
                return (
                  <div
                    key={index}
                    className="carousel-3d-item"
                    style={{
                      width: `${itemWidth}px`,
                      transform: `
                        translate3d(${index * totalWidth}px, ${style.y}px, ${style.z}px)
                        rotateY(${style.rotateY}deg)
                        scale(${style.scale})
                      `,
                      opacity: style.opacity,
                      zIndex: style.zIndex,
                      marginRight: index < items.length - 1 ? `${gap}px` : '0'
                    }}
                  >
                    <div className="carousel-3d-item-content">
                      <div 
                        className="carousel-3d-item-image"
                        style={{ backgroundColor: item.color }}
                      >
                        <span className="carousel-3d-item-number">{index + 1}</span>
                      </div>
                      <div className="carousel-3d-item-info">
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        <button 
          className="carousel-nav carousel-nav-prev"
          onClick={prev}
          disabled={currentIndex === 0}
        >
          ‹
        </button>
        <button 
          className="carousel-nav carousel-nav-next"
          onClick={next}
          disabled={currentIndex === items.length - 1}
        >
          ›
        </button>
      </div>
      
      <div className="carousel-3d-indicators">
        {items.map((_, index) => (
          <button
            key={index}
            className={`carousel-3d-indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
      
      <div className="carousel-info">
        <span className="carousel-info-index">{currentIndex + 1}</span>
        <span className="carousel-info-divider">/</span>
        <span className="carousel-info-total">{items.length}</span>
      </div>
    </div>
  )
}
