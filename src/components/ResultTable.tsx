import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface ResultTableProps {
  columns: string[];
  data: any[][];
  rowHeight?: number;
  height?: number;
  width?: number;
}

const ROW_HEIGHT = 36;
const BUFFER_ROWS = 5;
const DEFAULT_HEIGHT = 400;

export const ResultTable: React.FC<ResultTableProps> = ({
  columns,
  data,
  rowHeight = ROW_HEIGHT,
  height = DEFAULT_HEIGHT,
  width
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalHeight = useMemo(() => data.length * rowHeight, [data.length, rowHeight]);

  const visibleRowCount = useMemo(() => {
    return Math.ceil(height / rowHeight) + BUFFER_ROWS * 2;
  }, [height, rowHeight]);

  const startIndex = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
  }, [scrollTop, rowHeight]);

  const endIndex = useMemo(() => {
    return Math.min(data.length, startIndex + visibleRowCount);
  }, [startIndex, visibleRowCount, data.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    setScrollTop(0);
  }, [data]);

  if (data.length === 0) {
    return (
      <div 
        className="result-table-empty"
        style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          color: '#999'
        }}
      >
        无数据
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="result-table-container"
      style={{ 
        height, 
        width, 
        overflow: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: '4px'
      }}
      onScroll={handleScroll}
    >
      <div 
        style={{ height: totalHeight, position: 'relative' }}
      >
        <table 
          style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            tableLayout: 'fixed'
          }}
        >
          <thead 
            style={{ 
              position: 'sticky', 
              top: 0, 
              background: '#f5f5f5',
              zIndex: 1
            }}
          >
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e0e0e0',
                    fontWeight: 600,
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            style={{
              transform: `translateY(${startIndex * rowHeight}px)`,
              position: 'absolute',
              top: rowHeight,
              width: '100%'
            }}
          >
            {data.slice(startIndex, endIndex).map((row, rowIndex) => (
              <tr 
                key={startIndex + rowIndex}
                style={{ 
                  height: rowHeight,
                  backgroundColor: (startIndex + rowIndex) % 2 === 0 ? '#fafafa' : 'white'
                }}
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      padding: '6px 12px',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'middle'
                    }}
                    title={String(cell)}
                  >
                    {cell == null ? '' : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
