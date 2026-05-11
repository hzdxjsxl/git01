export type NodeType =
  | 'root'
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'listItem'
  | 'text'
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'lineBreak'
  | 'blockquote';

export interface MarkdownNode {
  type: NodeType;
  value?: string;
  level?: number;
  ordered?: boolean;
  url?: string;
  children?: MarkdownNode[];
}

class InlineParser {
  private source: string;
  private pos: number;

  constructor(source: string) {
    this.source = source;
    this.pos = 0;
  }

  parse(): MarkdownNode[] {
    return this.parseInline();
  }

  private eof(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(offset: number = 0): string {
    return this.source[this.pos + offset] || '';
  }

  private advance(n: number = 1): void {
    this.pos += n;
  }



  private parseInline(): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];

    while (!this.eof()) {
      const node = this.parseAny();
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  private parseAny(): MarkdownNode | null {
    return (
      this.parseLineBreak() ||
      this.parseCode() ||
      this.parseLink() ||
      this.parseBold() ||
      this.parseItalic() ||
      this.parseText()
    );
  }

  private parseLineBreak(): MarkdownNode | null {
    if (this.peek() === '\n') {
      this.advance();
      return { type: 'lineBreak' };
    }
    return null;
  }

  private parseCode(): MarkdownNode | null {
    if (this.peek() !== '`') {
      return null;
    }

    const startPos = this.pos;
    this.advance();

    while (!this.eof() && this.peek() !== '`') {
      this.advance();
    }

    if (this.eof()) {
      this.pos = startPos;
      return null;
    }

    this.advance();

    const value = this.source.slice(startPos + 1, this.pos - 1);
    return { type: 'code', value };
  }

  private parseLink(): MarkdownNode | null {
    if (this.peek() !== '[') {
      return null;
    }

    const startPos = this.pos;
    this.advance();

    let linkText = '';
    while (!this.eof() && this.peek() !== ']') {
      linkText += this.peek();
      this.advance();
    }

    if (this.eof() || this.peek() !== ']') {
      this.pos = startPos;
      return null;
    }

    this.advance();

    if (this.peek() !== '(') {
      this.pos = startPos;
      return null;
    }

    this.advance();

    let url = '';
    while (!this.eof() && this.peek() !== ')') {
      url += this.peek();
      this.advance();
    }

    if (this.eof()) {
      this.pos = startPos;
      return null;
    }

    this.advance();

    const children = new InlineParser(linkText).parse();
    return {
      type: 'link',
      url: url.trim(),
      children
    };
  }

  private parseBold(): MarkdownNode | null {
    const delimiter = this.peek() + this.peek(1);
    if (delimiter !== '**' && delimiter !== '__') {
      return null;
    }

    const startPos = this.pos;
    this.advance(2);

    const contentEnd = this.findMatchingDelimiter(delimiter, false);

    if (contentEnd === -1) {
      this.pos = startPos;
      return null;
    }

    const content = this.source.slice(this.pos, contentEnd);
    this.pos = contentEnd + delimiter.length;

    const children = new InlineParser(content).parse();
    return { type: 'bold', children };
  }

  private parseItalic(): MarkdownNode | null {
    const char = this.peek();
    if (char !== '*' && char !== '_') {
      return null;
    }

    const startPos = this.pos;
    this.advance();

    const contentEnd = this.findMatchingDelimiter(char, true);

    if (contentEnd === -1) {
      this.pos = startPos;
      return null;
    }

    const content = this.source.slice(this.pos, contentEnd);
    this.pos = contentEnd + char.length;

    const children = new InlineParser(content).parse();
    return { type: 'italic', children };
  }

  private findMatchingDelimiter(
    delimiter: string,
    isItalic: boolean
  ): number {
    let depth = 1;
    let i = this.pos;

    while (i < this.source.length) {
      const char = this.source[i];
      const nextChar = this.source[i + 1] || '';

      if (!isItalic) {
        const current = char + nextChar;
        if (current === delimiter) {
          depth--;
          if (depth === 0) {
            return i;
          }
          i += 2;
          continue;
        } else if ((current === '**' && delimiter === '__') || (current === '__' && delimiter === '**')) {
          depth++;
          i += 2;
          continue;
        }
      }

      if (isItalic && char === delimiter) {
        if (nextChar !== delimiter) {
          depth--;
          if (depth === 0) {
            return i;
          }
        }
      }

      if (char === '`') {
        i++;
        while (i < this.source.length && this.source[i] !== '`') {
          i++;
        }
        if (i < this.source.length) {
          i++;
        }
        continue;
      }

      if (char === '[') {
        i++;
        while (i < this.source.length && this.source[i] !== ']') {
          i++;
        }
        if (i < this.source.length) {
          i++;
        }
        continue;
      }

      i++;
    }

    return -1;
  }

  private parseText(): MarkdownNode | null {
    const startPos = this.pos;
    const delimiters = ['*', '_', '`', '[', '\n'];

    while (!this.eof() && !delimiters.includes(this.peek())) {
      this.advance();
    }

    if (this.pos === startPos) {
      if (this.peek() === '*' || this.peek() === '_') {
        this.advance();
        return { type: 'text', value: this.source[startPos] };
      }
      return null;
    }

    return { type: 'text', value: this.source.slice(startPos, this.pos) };
  }
}

export class Parser {
  parse(source: string): MarkdownNode {
    const lines = source.split('\n');
    const children: MarkdownNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === '') {
        i++;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        children.push({
          type: 'heading',
          level: headingMatch[1].length,
          children: new InlineParser(headingMatch[2]).parse()
        });
        i++;
        continue;
      }

      const blockquoteMatch = line.match(/^>\s+(.*)$/);
      if (blockquoteMatch) {
        const blockquoteLines: string[] = [];
        while (i < lines.length && lines[i].match(/^>\s+/)) {
          blockquoteLines.push(lines[i].replace(/^>\s+/, ''));
          i++;
        }
        children.push({
          type: 'blockquote',
          children: this.parse(blockquoteLines.join('\n')).children || []
        });
        continue;
      }

      const orderedListMatch = line.match(/^\d+\.\s+(.*)$/);
      if (orderedListMatch) {
        const listItems: MarkdownNode[] = [];
        while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
          const itemContent = lines[i].replace(/^\d+\.\s+/, '');
          listItems.push({
            type: 'listItem',
            children: new InlineParser(itemContent).parse()
          });
          i++;
        }
        children.push({
          type: 'list',
          ordered: true,
          children: listItems
        });
        continue;
      }

      const unorderedListMatch = line.match(/^[-*]\s+(.*)$/);
      if (unorderedListMatch) {
        const listItems: MarkdownNode[] = [];
        while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
          const itemContent = lines[i].replace(/^[-*]\s+/, '');
          listItems.push({
            type: 'listItem',
            children: new InlineParser(itemContent).parse()
          });
          i++;
        }
        children.push({
          type: 'list',
          ordered: false,
          children: listItems
        });
        continue;
      }

      const paragraphLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        paragraphLines.push(lines[i]);
        i++;
      }
      children.push({
        type: 'paragraph',
        children: new InlineParser(paragraphLines.join('\n')).parse()
      });
    }

    return { type: 'root', children };
  }
}
