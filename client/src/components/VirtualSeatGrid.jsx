import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import './VirtualSeatGrid.css';

const SEAT_SIZE = 22;
const SEAT_GAP = 3;
const SEAT_STRIDE = SEAT_SIZE + SEAT_GAP;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;
const LABEL_WIDTH = 36;
const BUFFER_ROWS = 2;
const BUFFER_COLS = 4;

const SEAT_CLASS_MAP = {
  0: 'seat available',
  1: 'seat taken',
};

export default function VirtualSeatGrid({
  seatData,
  cols,
  rows,
  selectedSeats,
  pendingSeats,
  onSeatClick,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [viewportHeight, setViewportHeight] = useState(600);
  const rafRef = useRef(null);

  const totalWidth = LABEL_WIDTH + cols * SEAT_STRIDE;
  const totalHeight = rows * ROW_HEIGHT;

  const visibleRange = useMemo(() => {
    const startRow = Math.max(
      0,
      Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS
    );
    const endRow = Math.min(
      rows,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS
    );

    const seatScrollLeft = Math.max(0, scrollLeft - LABEL_WIDTH);
    const startCol = Math.max(
      0,
      Math.floor(seatScrollLeft / SEAT_STRIDE) - BUFFER_COLS
    );
    const endCol = Math.min(
      cols,
      Math.ceil((scrollLeft + viewportWidth - LABEL_WIDTH) / SEAT_STRIDE) +
        BUFFER_COLS
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollTop, scrollLeft, viewportWidth, viewportHeight, rows, cols]);

  const handleScroll = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(e.target.scrollTop);
      setScrollLeft(e.target.scrollLeft);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setViewportWidth(container.clientWidth);
      setViewportHeight(container.clientHeight);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSeatClick = useCallback(
    (e) => {
      const target = e.target.closest('.seat');
      if (!target) return;
      const index = Number(target.dataset.index);
      if (!Number.isNaN(index)) {
        onSeatClick(index);
      }
    },
    [onSeatClick]
  );

  if (!seatData) return null;

  const { startRow, endRow, startCol, endCol } = visibleRange;

  const labelNodes = [];
  for (let row = startRow; row < endRow; row++) {
    labelNodes.push(
      <div
        key={`l-${row}`}
        className="row-label"
        style={{
          top: row * ROW_HEIGHT,
          height: ROW_HEIGHT,
        }}
      >
        {row + 1}
      </div>
    );
  }

  const seatNodes = [];
  for (let row = startRow; row < endRow; row++) {
    const rowBase = row * cols;
    for (let col = startCol; col < endCol; col++) {
      const index = rowBase + col;
      if (index >= seatData.length) break;

      const state = seatData[index];
      const isSelected = selectedSeats.has(index);
      const isPending = pendingSeats.has(index);

      let className = SEAT_CLASS_MAP[state] || 'seat available';
      if (isPending) {
        className = 'seat pending';
      } else if (isSelected) {
        className = 'seat selected';
      }

      seatNodes.push(
        <div
          key={`s-${row}-${col}`}
          className={className}
          data-index={index}
          style={{
            top: row * ROW_HEIGHT,
            left: LABEL_WIDTH + col * SEAT_STRIDE,
            width: SEAT_SIZE,
            height: SEAT_SIZE,
          }}
          title={`R${row + 1}-${col + 1}`}
        />
      );
    }
  }

  return (
    <div
      className="virtual-seat-container"
      ref={containerRef}
      onScroll={handleScroll}
      onClick={handleSeatClick}
    >
      <div
        className="virtual-seat-spacer"
        style={{ width: totalWidth, height: totalHeight }}
      />
      <div
        className="virtual-seat-labels"
        style={{
          width: LABEL_WIDTH,
          transform: `translate3d(0, ${-scrollTop}px, 0)`,
        }}
      >
        {labelNodes}
      </div>
      <div
        className="virtual-seat-world"
        style={{
          transform: `translate3d(${-scrollLeft}px, ${-scrollTop}px, 0)`,
        }}
      >
        {seatNodes}
      </div>
    </div>
  );
}
