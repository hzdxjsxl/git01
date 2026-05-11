import { Block, BlockAction, BlockStoreState, BlockStoreListeners } from '../types';

const generateId = (): string => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const createBlock = (type: Block['type'] = 'paragraph', content: string = ''): Block => {
  return {
    id: generateId(),
    type,
    content,
  };
};

class BlockStore {
  private state: BlockStoreState;
  private listeners: Partial<BlockStoreListeners> = {};

  constructor(initialBlocks: Block[] = [], maxHistory: number = 50) {
    this.state = {
      blocks: [...initialBlocks],
      history: [[...initialBlocks]],
      historyIndex: 0,
      maxHistory,
    };
  }

  getBlocks(): Block[] {
    return [...this.state.blocks];
  }

  getBlock(id: string): Block | undefined {
    return this.state.blocks.find((b) => b.id === id);
  }

  getBlockIndex(id: string): number {
    return this.state.blocks.findIndex((b) => b.id === id);
  }

  canUndo(): boolean {
    return this.state.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  setListener<K extends keyof BlockStoreListeners>(key: K, listener: BlockStoreListeners[K]): void {
    this.listeners[key] = listener;
  }

  removeListener<K extends keyof BlockStoreListeners>(key: K): void {
    delete this.listeners[key];
  }

  dispatch(action: BlockAction): void {
    switch (action.type) {
      case 'ADD_BLOCK': {
        const { index, block } = action.payload;
        const newBlocks = [...this.state.blocks];
        newBlocks.splice(index, 0, block);
        this.saveToHistory(newBlocks);
        break;
      }

      case 'UPDATE_BLOCK': {
        const { id, updates } = action.payload;
        const newBlocks = this.state.blocks.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        );
        this.saveToHistory(newBlocks);
        break;
      }

      case 'DELETE_BLOCK': {
        const { id } = action.payload;
        const newBlocks = this.state.blocks.filter((b) => b.id !== id);
        this.saveToHistory(newBlocks);
        break;
      }

      case 'MOVE_BLOCK': {
        const { fromIndex, toIndex } = action.payload;
        if (fromIndex === toIndex) return;

        const newBlocks = [...this.state.blocks];
        const [moved] = newBlocks.splice(fromIndex, 1);
        newBlocks.splice(toIndex, 0, moved);
        this.saveToHistory(newBlocks);
        break;
      }

      case 'SET_BLOCKS': {
        this.saveToHistory(action.payload);
        break;
      }

      case 'UNDO': {
        this.undo();
        break;
      }

      case 'REDO': {
        this.redo();
        break;
      }
    }
  }

  private saveToHistory(newBlocks: Block[]): void {
    const newHistory = this.state.history.slice(0, this.state.historyIndex + 1);
    newHistory.push([...newBlocks]);

    if (newHistory.length > this.state.maxHistory) {
      newHistory.shift();
    }

    this.state = {
      ...this.state,
      blocks: [...newBlocks],
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };

    this.notify();
  }

  private undo(): void {
    if (!this.canUndo()) return;

    this.state = {
      ...this.state,
      historyIndex: this.state.historyIndex - 1,
      blocks: [...this.state.history[this.state.historyIndex - 1]],
    };

    this.notify();
  }

  private redo(): void {
    if (!this.canRedo()) return;

    this.state = {
      ...this.state,
      historyIndex: this.state.historyIndex + 1,
      blocks: [...this.state.history[this.state.historyIndex + 1]],
    };

    this.notify();
  }

  private notify(): void {
    if (this.listeners.onChange) {
      this.listeners.onChange(this.getBlocks());
    }

    if (this.listeners.onHistoryChange) {
      this.listeners.onHistoryChange(this.canUndo(), this.canRedo());
    }
  }

  static createBlock = createBlock;
  static generateId = generateId;
}

export { BlockStore, createBlock, generateId };