import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import './VirtualSeatGrid.css';

const SEAT_SIZE = 22;
const SEAT_GAP = 3;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;
const BUFFER_ROWS = 6;
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
  const [viewportHeight, setViewportHeight] = useState(600);
  const rafRef = useRef(null);

  const totalHeight = rows * ROW_HEIGHT;

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endRow = Math.min(
      rows,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS
    );
    return { startRow, endRow };
  }, [scrollTop, viewportHeight, rows]);

  const handleScroll = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(e.target.scrollTop);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setViewportHeight(container.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
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

  const { startRow, endRow } = visibleRange;

  const renderedRows = [];
  for (let row = startRow; row < endRow; row++) {
    const startIndex = row * cols;
    const endIndex = Math.min(startIndex + cols, seatData.length);
    const seats = [];

    for (let i = startIndex; i < endIndex; i++) {
      const state = seatData[i];
      const isSelected = selectedSeats.has(i);
      const isPending = pendingSeats.has(i);

      let className = SEAT_CLASS_MAP[state] || 'seat available';
      if (isPending) {
        className = 'seat pending';
      } else if (isSelected) {
        className = 'seat selected';
      }

      const seatNumber = `R${row + 1}-${(i % cols) + 1}`;

      seats.push(
        <div
          key={i}
          className={className}
          data-index={i}
          title={seatNumber}
        />
      );
    }

    renderedRows.push(
      <div
        key={row}
        className="seat-row"
        style={{ transform: `translateY(${row * ROW_HEIGHT}px)` }}
      >
        <div className="row-label">{row + 1}</div>
        <div className="seat-row-grid">{seats}</div>
      </div>
    );
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
        style={{ height: totalHeight }}
      >
        <div
          className="virtual-seat-viewport"
          style={{
            transform: `translateY(${startRow * ROW_HEIGHT}px)`,
            height: (endRow - startRow) * ROW_HEIGHT,
          }}
        >
          {renderedRows}
        </div>
      </div>
    </div>
  );
}
