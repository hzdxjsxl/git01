import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SequenceAligner, Difference, AlignmentResult } from '../utils/SequenceAligner';

interface VirtualDNAViewerProps {
  reference: string;
  variant: string;
  basesPerRow?: number;
  rowHeight?: number;
  containerHeight?: number;
  onPositionClick?: (position: number) => void;
  onPositionHover?: (position: number | null) => void;
}

interface VisibleRows {
  startRow: number;
  endRow: number;
  startPosition: number;
  endPosition: number;
}

const BASES_PER_ROW = 50;
const ROW_HEIGHT = 40;
const CONTAINER_HEIGHT = 600;
const OVERSCAN_ROWS = 10;

const BASE_COLORS: Record<string, string> = {
  A: '#22c55e',
  T: '#ef4444',
  C: '#3b82f6',
  G: '#f59e0b',
  '-': '#9ca3af'
};

const DIFFERENCE_BG: Record<Difference['type'], string> = {
  mismatch: 'rgba(251, 191, 36, 0.3)',
  insertion: 'rgba(34, 197, 94, 0.3)',
  deletion: 'rgba(239, 68, 68, 0.3)'
};

export const VirtualDNAViewer: React.FC<VirtualDNAViewerProps> = ({
  reference,
  variant,
  basesPerRow = BASES_PER_ROW,
  rowHeight = ROW_HEIGHT,
  containerHeight = CONTAINER_HEIGHT,
  onPositionClick,
  onPositionHover
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const aligner = useMemo(() => {
    return new SequenceAligner(reference, variant);
  }, [reference, variant]);

  const alignmentResult = useMemo(() => {
    return aligner.findAllDifferences();
  }, [aligner]);

  const totalRows = useMemo(() => {
    return Math.ceil(alignmentResult.totalPositions / basesPerRow);
  }, [alignmentResult.totalPositions, basesPerRow]);

  const totalHeight = totalRows * rowHeight;

  const visibleRows = useMemo<VisibleRows>(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + OVERSCAN_ROWS
    );

    return {
      startRow,
      endRow,
      startPosition: startRow * basesPerRow,
      endPosition: Math.min((endRow + 1) * basesPerRow, alignmentResult.totalPositions)
    };
  }, [scrollTop, rowHeight, containerHeight, totalRows, basesPerRow, alignmentResult.totalPositions]);

  const differencesInView = useMemo(() => {
    return aligner.getDifferencesInRange(
      visibleRows.startPosition,
      visibleRows.endPosition
    );
  }, [aligner, visibleRows]);

  const differencesSet = useMemo(() => {
    const diffMap = new Map<number, Difference>();
    for (const diff of alignmentResult.differences) {
      diffMap.set(diff.position, diff);
    }
    return diffMap;
  }, [alignmentResult.differences]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleBaseClick = useCallback(
    (position: number) => {
      setSelectedPosition(position);
      onPositionClick?.(position);
    },
    [onPositionClick]
  );

  const handleBaseHover = useCallback(
    (position: number | null) => {
      setHoveredPosition(position);
      onPositionHover?.(position);
    },
    [onPositionHover]
  );

  const scrollToPosition = useCallback(
    (position: number) => {
      const row = Math.floor(position / basesPerRow);
      const newScrollTop = row * rowHeight - containerHeight / 2 + rowHeight / 2;
      if (containerRef.current) {
        containerRef.current.scrollTop = Math.max(0, Math.min(newScrollTop, totalHeight - containerHeight));
      }
      setSelectedPosition(position);
    },
    [basesPerRow, rowHeight, containerHeight, totalHeight]
  );

  useEffect(() => {
    setScrollTop(0);
    setSelectedPosition(null);
    setHoveredPosition(null);
  }, [reference, variant]);

  const renderRows = useMemo(() => {
    const rows = [];

    for (let row = visibleRows.startRow; row <= visibleRows.endRow; row++) {
      const rowStart = row * basesPerRow;
      const rowEnd = Math.min(rowStart + basesPerRow, alignmentResult.totalPositions);
      const bases = [];

      for (let pos = rowStart; pos < rowEnd; pos++) {
        const { reference: refBase, variant: varBase } = aligner.getBaseAtPosition(pos);
        const isDifferent = differencesSet.has(pos);
        const difference = differencesSet.get(pos);
        const isHovered = hoveredPosition === pos;
        const isSelected = selectedPosition === pos;

        const refColor = BASE_COLORS[refBase] || '#64748b';
        const varColor = BASE_COLORS[varBase] || '#64748b';
        const bgColor = difference ? DIFFERENCE_BG[difference.type] : 'transparent';

        bases.push(
          <div
            key={pos}
            className="flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110"
            style={{
              width: `${100 / basesPerRow}%`,
              height: '100%',
              backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.4)' : isHovered ? 'rgba(148, 163, 184, 0.3)' : bgColor,
              borderLeft: pos % 10 === 0 ? '1px solid #374151' : 'none',
              borderRight: (pos + 1) % 10 === 0 ? '1px solid #374151' : 'none'
            }}
            onClick={() => handleBaseClick(pos)}
            onMouseEnter={() => handleBaseHover(pos)}
            onMouseLeave={() => handleBaseHover(null)}
            title={`Position ${pos + 1}: ${refBase} → ${varBase}${difference ? ` (${difference.type})` : ''}`}
          >
            <div className="flex flex-col items-center justify-center text-xs font-mono w-full h-full">
              <span style={{ color: refColor, fontWeight: isDifferent ? 'bold' : 'normal' }}>
                {refBase}
              </span>
              <span style={{ color: varColor, fontWeight: isDifferent ? 'bold' : 'normal' }}>
                {varBase}
              </span>
            </div>
          </div>
        );
      }

      while (bases.length < basesPerRow) {
        bases.push(
          <div
            key={`empty-${row}-${bases.length}`}
            style={{ width: `${100 / basesPerRow}%`, height: '100%', backgroundColor: '#111827' }}
          />
        );
      }

      rows.push(
        <div
          key={row}
          className="flex border-b border-gray-700"
          style={{
            position: 'absolute',
            top: row * rowHeight,
            height: rowHeight,
            width: '100%'
          }}
        >
          <div
            className="flex items-center justify-end pr-2 text-xs text-gray-400 font-mono bg-gray-800"
            style={{ width: '60px', minWidth: '60px', height: '100%' }}
          >
            {rowStart + 1}
          </div>
          <div className="flex flex-1 h-full">{bases}</div>
        </div>
      );
    }

    return rows;
  }, [
    visibleRows,
    basesPerRow,
    rowHeight,
    alignmentResult.totalPositions,
    aligner,
    differencesSet,
    hoveredPosition,
    selectedPosition,
    handleBaseClick,
    handleBaseHover
  ]);

  return (
    <div className="w-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-gray-100">Total Positions:</span> {alignmentResult.totalPositions.toLocaleString()}
          </div>
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-gray-100">Differences:</span>{' '}
            <span className="text-yellow-400 font-semibold">{alignmentResult.mismatchedCount.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-gray-100">Similarity:</span>{' '}
            <span className="text-green-400 font-semibold">{(alignmentResult.similarity * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BASE_COLORS.A }} />
            <span className="text-gray-400">A</span>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BASE_COLORS.T }} />
            <span className="text-gray-400">T</span>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BASE_COLORS.C }} />
            <span className="text-gray-400">C</span>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BASE_COLORS.G }} />
            <span className="text-gray-400">G</span>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-800 border-b border-gray-700" style={{ height: rowHeight }}>
        <div
          className="flex items-center justify-center text-xs font-semibold text-gray-400 bg-gray-750"
          style={{ width: '60px', minWidth: '60px' }}
        >
          Pos
        </div>
        <div className="flex flex-1 items-stretch h-full">
          {Array.from({ length: basesPerRow }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-center text-xs font-mono"
              style={{
                width: `${100 / basesPerRow}%`,
                color: i % 10 === 0 ? '#94a3b8' : '#475569',
                fontSize: i % 10 === 0 ? '10px' : '8px'
              }}
            >
              {i % 10 === 0 ? (i + 1) % 100 : ''}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{ height: containerHeight, width: '100%' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, width: '100%' }}>
          {renderRows}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {hoveredPosition !== null
              ? `Position: ${hoveredPosition + 1} | Ref: ${aligner.getBaseAtPosition(hoveredPosition).reference} | Var: ${aligner.getBaseAtPosition(hoveredPosition).variant}`
              : 'Hover over a base to see details'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Go to position:</span>
          <input
            type="number"
            min={1}
            max={alignmentResult.totalPositions}
            className="w-24 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-indigo-500"
            placeholder="1"
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (value >= 1 && value <= alignmentResult.totalPositions) {
                scrollToPosition(value - 1);
              }
            }}
          />
        </div>
      </div>

      {alignmentResult.differences.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs">
          <span className="text-gray-400">Difference Types:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: DIFFERENCE_BG.mismatch }} />
            <span className="text-gray-300">Mismatch</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: DIFFERENCE_BG.insertion }} />
            <span className="text-gray-300">Insertion</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: DIFFERENCE_BG.deletion }} />
            <span className="text-gray-300">Deletion</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualDNAViewer;
