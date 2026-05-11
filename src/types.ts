export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'quote' | 'code';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
}

export interface SelectionState {
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
}

export interface BlockStoreState {
  blocks: Block[];
  history: Block[][];
  historyIndex: number;
  maxHistory: number;
}

export type BlockAction =
  | { type: 'ADD_BLOCK'; payload: { index: number; block: Block } }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<Block> } }
  | { type: 'DELETE_BLOCK'; payload: { id: string } }
  | { type: 'MOVE_BLOCK'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_BLOCKS'; payload: Block[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface BlockStoreListeners {
  onChange: (blocks: Block[]) => void;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
}