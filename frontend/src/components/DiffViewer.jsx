import React, { useRef, useEffect } from 'react';
import { OperationType } from '../algorithms/myersDiff';

const getLineClass = (type, side) => {
  switch (type) {
    case OperationType.DELETE:
      return side === 'left' ? 'line-delete' : 'line-empty';
    case OperationType.INSERT:
      return side === 'left' ? 'line-empty' : 'line-insert';
    case OperationType.REPLACE:
      return side === 'left' ? 'line-replace-old' : 'line-replace-new';
    case OperationType.EQUAL:
    default:
      return 'line-equal';
  }
};

const LineNumber = ({ number }) => (
  <span className="line-number">{number ? number.toString() : ''}</span>
);

const LineContent = ({ content, type, side }) => {
  const lineClass = getLineClass(type, side);
  const displayContent = content === null ? '' : content;
  
  return (
    <span className={`line-content ${lineClass}`}>
      {displayContent || '\u00A0'}
    </span>
  );
};

const Line = ({ item, side, index }) => (
  <div className={`diff-line ${getLineClass(item.type, side)}`} key={index}>
    <LineNumber number={item.lineNumber} />
    <LineContent content={item.content} type={item.type} side={side} />
  </div>
);

const DiffPanel = ({ title, lines, side, onScroll, scrollRef }) => (
  <div className="diff-panel">
    <div className="panel-header">
      <h3>{title}</h3>
      <span className="line-count">{lines.length} lines</span>
    </div>
    <div 
      className="diff-content" 
      ref={scrollRef}
      onScroll={onScroll}
    >
      {lines.map((line, index) => (
        <Line item={line} side={side} index={index} key={index} />
      ))}
    </div>
  </div>
);

const StatsBar = ({ stats, duration }) => {
  const totalChanges = stats.insertions + stats.deletions;
  const similarity = stats.oldLines > 0 
    ? ((stats.equals / stats.oldLines) * 100).toFixed(1) 
    : 0;
  
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-label">旧版本:</span>
        <span className="stat-value">{stats.oldLines.toLocaleString()} 行</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">新版本:</span>
        <span className="stat-value">{stats.newLines.toLocaleString()} 行</span>
      </div>
      <div className="stat-item stat-insert">
        <span className="stat-label">新增:</span>
        <span className="stat-value">{stats.insertions.toLocaleString()}</span>
      </div>
      <div className="stat-item stat-delete">
        <span className="stat-label">删除:</span>
        <span className="stat-value">{stats.deletions.toLocaleString()}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">总变更:</span>
        <span className="stat-value">{totalChanges.toLocaleString()}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">相似度:</span>
        <span className="stat-value">{similarity}%</span>
      </div>
      <div className="stat-item stat-duration">
        <span className="stat-label">耗时:</span>
        <span className="stat-value">{(duration / 1000).toFixed(2)}s</span>
      </div>
    </div>
  );
};

const DiffViewer = ({ result }) => {
  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  
  useEffect(() => {
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = 0;
      rightScrollRef.current.scrollTop = 0;
    }
  }, [result]);
  
  const handleLeftScroll = () => {
    if (rightScrollRef.current && leftScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    }
  };
  
  const handleRightScroll = () => {
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }
  };
  
  if (!result) {
    return (
      <div className="diff-viewer empty">
        <div className="empty-message">
          <h2>等待比较</h2>
          <p>加载文本并点击"比较"按钮开始差异分析</p>
        </div>
      </div>
    );
  }
  
  const { sideBySide, stats, duration } = result;
  
  return (
    <div className="diff-viewer">
      <StatsBar stats={stats} duration={duration} />
      <div className="diff-container">
        <DiffPanel 
          title="旧版本 (Original)" 
          lines={sideBySide.left} 
          side="left"
          onScroll={handleLeftScroll}
          scrollRef={leftScrollRef}
        />
        <div className="diff-divider"></div>
        <DiffPanel 
          title="新版本 (Modified)" 
          lines={sideBySide.right} 
          side="right"
          onScroll={handleRightScroll}
          scrollRef={rightScrollRef}
        />
      </div>
    </div>
  );
};

export default DiffViewer;
