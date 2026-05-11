import React, { useRef, useEffect } from 'react';
import { Block as BlockType, BlockType as BlockTypeEnum } from '../types';

interface BlockProps {
  block: BlockType;
  onContentChange: (id: string, content: string) => void;
  onKeyDown: (event: React.KeyboardEvent, blockId: string) => void;
  onFocus: (blockId: string) => void;
  onDragStart: (e: React.DragEvent, blockId: string) => void;
  onDragOver: (e: React.DragEvent, blockId: string) => void;
  onDrop: (e: React.DragEvent, blockId: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

const Block: React.FC<BlockProps> = ({
  block,
  onContentChange,
  onKeyDown,
  onFocus,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
  isDropTarget = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerText !== block.content) {
      contentRef.current.innerText = block.content;
    }
  }, [block.content]);

  const handleInput = () => {
    if (contentRef.current) {
      onContentChange(block.id, contentRef.current.innerText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, block.id);
  };

  const handleFocus = () => {
    onFocus(block.id);
  };

  const getBlockClasses = () => {
    const base = 'block-editor-block relative group';
    const typeClass = `block-type-${block.type}`;
    const dragClass = isDragging ? 'opacity-50' : '';
    const dropClass = isDropTarget ? 'border-t-2 border-blue-500' : '';
    return `${base} ${typeClass} ${dragClass} ${dropClass}`;
  };

  const getContentPlaceholder = (): string => {
    const placeholders: Record<BlockTypeEnum, string> = {
      paragraph: '输入文本，或按 / 选择块类型...',
      heading1: '标题 1',
      heading2: '标题 2',
      heading3: '标题 3',
      bullet: '无序列表项',
      numbered: '有序列表项',
      quote: '引用',
      code: '代码块',
    };
    return placeholders[block.type] || '输入文本...';
  };

  return (
    <div
      className={getBlockClasses()}
      data-block-id={block.id}
      draggable
      onDragStart={(e) => onDragStart(e, block.id)}
      onDragOver={(e) => onDragOver(e, block.id)}
      onDrop={(e) => onDrop(e, block.id)}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          <button
            className="block-handle w-5 h-5 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
            title="拖拽移动"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="6" r="1"/>
              <circle cx="9" cy="12" r="1"/>
              <circle cx="9" cy="18" r="1"/>
              <circle cx="15" cy="6" r="1"/>
              <circle cx="15" cy="12" r="1"/>
              <circle cx="15" cy="18" r="1"/>
            </svg>
          </button>
          <button
            className="block-add w-5 h-5 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded"
            title="添加块"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div
          ref={contentRef}
          className={`block-content flex-1 outline-none min-h-[1.5em] ${block.type === 'code' ? 'font-mono bg-gray-100 p-2 rounded' : ''}`}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          data-placeholder={getContentPlaceholder()}
        />
      </div>
    </div>
  );
};

export { Block };