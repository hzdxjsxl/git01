import { Block, SelectionState } from '../types';

interface SelectionManagerOptions {
  getBlocks: () => Block[];
  getBlockElement: (id: string) => HTMLElement | null;
  onSelectionChange: (selection: SelectionState | null) => void;
}

class SelectionManager {
  private options: SelectionManagerOptions;
  private currentSelection: SelectionState | null = null;

  constructor(options: SelectionManagerOptions) {
    this.options = options;
  }

  getSelection(): SelectionState | null {
    return this.currentSelection;
  }

  setSelection(selection: SelectionState): void {
    this.currentSelection = selection;
    this.options.onSelectionChange(selection);
    this.applySelectionToDOM(selection);
  }

  clearSelection(): void {
    this.currentSelection = null;
    this.options.onSelectionChange(null);
    const domSelection = window.getSelection();
    if (domSelection) {
      domSelection.removeAllRanges();
    }
  }

  moveToPreviousBlock(blockId: string, offset: number): SelectionState | null {
    const blocks = this.options.getBlocks();
    const index = blocks.findIndex((b) => b.id === blockId);

    if (index <= 0) return null;

    const prevBlock = blocks[index - 1];
    const newOffset = Math.min(offset, prevBlock.content.length);

    return {
      startBlockId: prevBlock.id,
      startOffset: newOffset,
      endBlockId: prevBlock.id,
      endOffset: newOffset,
    };
  }

  moveToNextBlock(blockId: string, offset: number): SelectionState | null {
    const blocks = this.options.getBlocks();
    const index = blocks.findIndex((b) => b.id === blockId);

    if (index >= blocks.length - 1) return null;

    const nextBlock = blocks[index + 1];
    const newOffset = Math.min(offset, nextBlock.content.length);

    return {
      startBlockId: nextBlock.id,
      startOffset: newOffset,
      endBlockId: nextBlock.id,
      endOffset: newOffset,
    };
  }

  moveUp(blockId: string, offset: number): SelectionState | null {
    return this.moveToPreviousBlock(blockId, offset);
  }

  moveDown(blockId: string, offset: number): SelectionState | null {
    return this.moveToNextBlock(blockId, offset);
  }

  moveToStartOfDocument(): SelectionState | null {
    const blocks = this.options.getBlocks();
    if (blocks.length === 0) return null;

    const firstBlock = blocks[0];
    return {
      startBlockId: firstBlock.id,
      startOffset: 0,
      endBlockId: firstBlock.id,
      endOffset: 0,
    };
  }

  moveToEndOfDocument(): SelectionState | null {
    const blocks = this.options.getBlocks();
    if (blocks.length === 0) return null;

    const lastBlock = blocks[blocks.length - 1];
    return {
      startBlockId: lastBlock.id,
      startOffset: lastBlock.content.length,
      endBlockId: lastBlock.id,
      endOffset: lastBlock.content.length,
    };
  }

  selectAll(): SelectionState | null {
    const blocks = this.options.getBlocks();
    if (blocks.length === 0) return null;

    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];

    return {
      startBlockId: firstBlock.id,
      startOffset: 0,
      endBlockId: lastBlock.id,
      endOffset: lastBlock.content.length,
    };
  }

  isCollapsed(): boolean {
    if (!this.currentSelection) return true;
    return (
      this.currentSelection.startBlockId === this.currentSelection.endBlockId &&
      this.currentSelection.startOffset === this.currentSelection.endOffset
    );
  }

  isSameBlock(): boolean {
    if (!this.currentSelection) return true;
    return this.currentSelection.startBlockId === this.currentSelection.endBlockId;
  }

  getSelectedBlocks(): Block[] {
    if (!this.currentSelection) return [];

    const blocks = this.options.getBlocks();
    const startIndex = blocks.findIndex((b) => b.id === this.currentSelection!.startBlockId);
    const endIndex = blocks.findIndex((b) => b.id === this.currentSelection!.endBlockId);

    if (startIndex === -1 || endIndex === -1) return [];

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    return blocks.slice(minIndex, maxIndex + 1);
  }

  getSelectedText(): string {
    if (!this.currentSelection) return '';

    const blocks = this.getSelectedBlocks();
    if (blocks.length === 0) return '';

    if (blocks.length === 1) {
      const startOffset = Math.min(this.currentSelection.startOffset, this.currentSelection.endOffset);
      const endOffset = Math.max(this.currentSelection.startOffset, this.currentSelection.endOffset);
      return blocks[0].content.substring(startOffset, endOffset);
    }

    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    const isForward = this.isForwardSelection();

    let text = isForward
      ? firstBlock.content.substring(this.currentSelection.startOffset)
      : firstBlock.content.substring(0, this.currentSelection.startOffset);

    for (let i = 1; i < blocks.length - 1; i++) {
      text += '\n' + blocks[i].content;
    }

    text += isForward
      ? '\n' + lastBlock.content.substring(0, this.currentSelection.endOffset)
      : '\n' + lastBlock.content.substring(this.currentSelection.endOffset);

    return text;
  }

  isForwardSelection(): boolean {
    if (!this.currentSelection) return true;
    if (this.currentSelection.startBlockId !== this.currentSelection.endBlockId) {
      const blocks = this.options.getBlocks();
      const startIndex = blocks.findIndex((b) => b.id === this.currentSelection!.startBlockId);
      const endIndex = blocks.findIndex((b) => b.id === this.currentSelection!.endBlockId);
      return startIndex < endIndex;
    }
    return this.currentSelection.startOffset <= this.currentSelection.endOffset;
  }

  syncFromDOM(): SelectionState | null {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      this.currentSelection = null;
      this.options.onSelectionChange(null);
      return null;
    }

    const range = domSelection.getRangeAt(0);
    const startBlock = this.getBlockFromNode(range.startContainer);
    const endBlock = this.getBlockFromNode(range.endContainer);

    if (!startBlock || !endBlock) {
      this.currentSelection = null;
      this.options.onSelectionChange(null);
      return null;
    }

    const startOffset = this.calculateTextOffset(range.startContainer, range.startOffset, startBlock);
    const endOffset = this.calculateTextOffset(range.endContainer, range.endOffset, endBlock);

    const selection: SelectionState = {
      startBlockId: startBlock.id,
      startOffset,
      endBlockId: endBlock.id,
      endOffset,
    };

    this.currentSelection = selection;
    this.options.onSelectionChange(selection);
    return selection;
  }

  private getBlockFromNode(node: Node): Block | null {
    let current: Node | null = node;
    const blocks = this.options.getBlocks();

    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          return blocks.find((b) => b.id === blockId) || null;
        }
      }
      current = current.parentNode;
    }

    return null;
  }

  private calculateTextOffset(node: Node, offset: number, block: Block): number {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const textBefore = textNode.textContent?.substring(0, offset) || '';
      return Math.min(textBefore.length, block.content.length);
    }

    const element = node as HTMLElement;
    const textBefore = element.innerText.substring(0, offset);
    return Math.min(textBefore.length, block.content.length);
  }

  private applySelectionToDOM(selection: SelectionState): void {
    const startElement = this.options.getBlockElement(selection.startBlockId);
    const endElement = this.options.getBlockElement(selection.endBlockId);

    if (!startElement || !endElement) return;

    const domSelection = window.getSelection();
    if (!domSelection) return;

    const range = document.createRange();

    const startTextNode = this.getFirstTextNode(startElement);
    const endTextNode = this.getFirstTextNode(endElement);

    if (startTextNode && endTextNode) {
      const startOffset = Math.min(selection.startOffset, startTextNode.length);
      const endOffset = Math.min(selection.endOffset, endTextNode.length);

      range.setStart(startTextNode, startOffset);
      range.setEnd(endTextNode, endOffset);

      domSelection.removeAllRanges();
      domSelection.addRange(range);
    }
  }

  private getFirstTextNode(element: HTMLElement): Text | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    return walker.nextNode() as Text | null;
  }
}

export { SelectionManager };