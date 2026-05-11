import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BlockStore, createBlock } from '../stores/BlockStore';
import { SelectionManager } from '../managers/SelectionManager';
import { Block } from './Block';
import { Block as BlockType, SelectionState } from '../types';

interface EditorBoardProps {
  initialBlocks?: BlockType[];
}

const EditorBoard: React.FC<EditorBoardProps> = ({ initialBlocks = [] }) => {
  const [blocks, setBlocks] = useState<BlockType[]>(initialBlocks);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const blockStoreRef = useRef<BlockStore>(new BlockStore(initialBlocks.length > 0 ? initialBlocks : [createBlock()]));
  const selectionManagerRef = useRef<SelectionManager | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const blockElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const store = blockStoreRef.current;

    store.setListener('onChange', (newBlocks) => {
      setBlocks(newBlocks);
    });

    store.setListener('onHistoryChange', (undo, redo) => {
      setCanUndo(undo);
      setCanRedo(redo);
    });

    selectionManagerRef.current = new SelectionManager({
      getBlocks: () => store.getBlocks(),
      getBlockElement: (id) => blockElementsRef.current.get(id) || null,
      onSelectionChange: (newSelection) => {
        setSelection(newSelection);
      },
    });

    setBlocks(store.getBlocks());

    return () => {
      store.removeListener('onChange');
      store.removeListener('onHistoryChange');
    };
  }, []);

  const getCaretPosition = (): { blockId: string; offset: number } | null => {
    if (!activeBlockId) return null;

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      return { blockId: activeBlockId, offset: 0 };
    }

    const range = domSelection.getRangeAt(0);
    let node: Node | null = range.startContainer;

    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          const block = blockStoreRef.current.getBlock(blockId);
          if (block) {
            let offset = 0;
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
              const textNode = range.startContainer as Text;
              const textBefore = textNode.textContent?.substring(0, range.startOffset) || '';
              offset = textBefore.length;
            } else {
              const element = range.startContainer as HTMLElement;
              const textBefore = element.innerText.substring(0, range.startOffset);
              offset = textBefore.length;
            }
            return { blockId, offset: Math.min(offset, block.content.length) };
          }
        }
      }
      node = node.parentNode;
    }

    return { blockId: activeBlockId, offset: 0 };
  };

  const handleContentChange = useCallback((id: string, content: string) => {
    blockStoreRef.current.dispatch({
      type: 'UPDATE_BLOCK',
      payload: { id, updates: { content } },
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const store = blockStoreRef.current;
    const selectionManager = selectionManagerRef.current;
    if (!selectionManager) return;

    const caret = getCaretPosition();
    if (!caret) return;

    const block = store.getBlock(blockId);
    if (!block) return;

    const isAtStart = caret.offset === 0;
    const isAtEnd = caret.offset >= block.content.length;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const index = store.getBlockIndex(blockId);
      const contentBeforeCursor = block.content.substring(0, caret.offset);
      const contentAfterCursor = block.content.substring(caret.offset);

      store.dispatch({
        type: 'UPDATE_BLOCK',
        payload: { id: blockId, updates: { content: contentBeforeCursor } },
      });

      const newBlock = createBlock('paragraph', contentAfterCursor);
      store.dispatch({
        type: 'ADD_BLOCK',
        payload: { index: index + 1, block: newBlock },
      });

      requestAnimationFrame(() => {
        selectionManager.setSelection({
          startBlockId: newBlock.id,
          startOffset: 0,
          endBlockId: newBlock.id,
          endOffset: 0,
        });
      });
    } else if (e.key === 'Backspace' && isAtStart && blocks.length > 1) {
      e.preventDefault();

      const index = store.getBlockIndex(blockId);

      if (index > 0) {
        const prevBlock = store.getBlocks()[index - 1];
        const prevContent = prevBlock.content.length;

        store.dispatch({
          type: 'UPDATE_BLOCK',
          payload: { id: prevBlock.id, updates: { content: prevBlock.content + block.content } },
        });

        store.dispatch({
          type: 'DELETE_BLOCK',
          payload: { id: blockId },
        });

        requestAnimationFrame(() => {
          selectionManager.setSelection({
            startBlockId: prevBlock.id,
            startOffset: prevContent,
            endBlockId: prevBlock.id,
            endOffset: prevContent,
          });
        });
      }
    } else if (e.key === 'Delete' && isAtEnd && blocks.length > 1) {
      e.preventDefault();

      const index = store.getBlockIndex(blockId);

      if (index < blocks.length - 1) {
        const nextBlock = store.getBlocks()[index + 1];
        const currentContent = block.content.length;

        store.dispatch({
          type: 'UPDATE_BLOCK',
          payload: { id: blockId, updates: { content: block.content + nextBlock.content } },
        });

        store.dispatch({
          type: 'DELETE_BLOCK',
          payload: { id: nextBlock.id },
        });

        requestAnimationFrame(() => {
          selectionManager.setSelection({
            startBlockId: blockId,
            startOffset: currentContent,
            endBlockId: blockId,
            endOffset: currentContent,
          });
        });
      }
    } else if (e.key === 'ArrowUp' && isAtStart) {
      e.preventDefault();
      const newSelection = selectionManager.moveUp(blockId, caret.offset);
      if (newSelection) {
        selectionManager.setSelection(newSelection);
      }
    } else if (e.key === 'ArrowDown' && isAtEnd) {
      e.preventDefault();
      const newSelection = selectionManager.moveDown(blockId, caret.offset);
      if (newSelection) {
        selectionManager.setSelection(newSelection);
      }
    } else if (e.key === 'ArrowLeft' && isAtStart) {
      e.preventDefault();
      const newSelection = selectionManager.moveToPreviousBlock(blockId, caret.offset);
      if (newSelection) {
        selectionManager.setSelection(newSelection);
      }
    } else if (e.key === 'ArrowRight' && isAtEnd) {
      e.preventDefault();
      const newSelection = selectionManager.moveToNextBlock(blockId, caret.offset);
      if (newSelection) {
        selectionManager.setSelection(newSelection);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          store.dispatch({ type: 'REDO' });
        } else {
          store.dispatch({ type: 'UNDO' });
        }
      } else if (e.key === 'y') {
        e.preventDefault();
        store.dispatch({ type: 'REDO' });
      } else if (e.key === 'a') {
        e.preventDefault();
        const selectAll = selectionManager.selectAll();
        if (selectAll) {
          selectionManager.setSelection(selectAll);
        }
      }
    }
  }, [blocks]);

  const handleFocus = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggingBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (blockId !== draggingBlockId) {
      setDropTargetBlockId(blockId);
    }
  }, [draggingBlockId]);

  const handleDrop = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    const draggedBlockId = e.dataTransfer.getData('text/plain');

    if (draggedBlockId && draggedBlockId !== blockId) {
      const store = blockStoreRef.current;
      const fromIndex = store.getBlockIndex(draggedBlockId);
      const toIndex = store.getBlockIndex(blockId);

      if (fromIndex !== -1 && toIndex !== -1) {
        store.dispatch({
          type: 'MOVE_BLOCK',
          payload: { fromIndex, toIndex },
        });
      }
    }

    setDraggingBlockId(null);
    setDropTargetBlockId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingBlockId(null);
    setDropTargetBlockId(null);
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (selectionManagerRef.current) {
      selectionManagerRef.current.syncFromDOM();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const setBlockElement = (id: string, element: HTMLElement | null) => {
    if (element) {
      blockElementsRef.current.set(id, element);
    } else {
      blockElementsRef.current.delete(id);
    }
  };

  return (
    <div className="editor-board" ref={editorRef} onDragEnd={handleDragEnd}>
      <div className="toolbar mb-4 flex gap-2">
        <button
          onClick={() => blockStoreRef.current.dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          撤销
        </button>
        <button
          onClick={() => blockStoreRef.current.dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          重做
        </button>
        <button
          onClick={() => {
            const newBlock = createBlock();
            blockStoreRef.current.dispatch({
              type: 'ADD_BLOCK',
              payload: { index: blocks.length, block: newBlock },
            });
          }}
          className="px-3 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded"
        >
          添加块
        </button>
      </div>

      <div className="blocks-container space-y-1">
        {blocks.map((block) => (
          <div
            key={block.id}
            ref={(el) => el && setBlockElement(block.id, el)}
          >
            <Block
              block={block}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggingBlockId === block.id}
              isDropTarget={dropTargetBlockId === block.id}
            />
          </div>
        ))}
      </div>

      {selection && (
        <div className="selection-info mt-4 text-sm text-gray-500">
        </div>
      )}
    </div>
  );
};

export { EditorBoard };