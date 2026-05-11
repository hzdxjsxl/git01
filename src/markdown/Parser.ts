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
          children: this.parseInline(headingMatch[2])
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
            children: this.parseInline(itemContent)
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
            children: this.parseInline(itemContent)
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
        children: this.parseInline(paragraphLines.join('\n'))
      });
    }

    return { type: 'root', children };
  }

  private parseInline(text: string): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];
    let remaining = text;

    const patterns: { regex: RegExp; handler: (match: RegExpMatchArray) => MarkdownNode }[] = [
      {
        regex: /^(\*\*|__)(.+?)\1/,
        handler: (m) => ({ type: 'bold', children: this.parseInline(m[2]) })
      },
      {
        regex: /^(\*|_)(.+?)\1/,
        handler: (m) => ({ type: 'italic', children: this.parseInline(m[2]) })
      },
      {
        regex: /^`([^`]+)`/,
        handler: (m) => ({ type: 'code', value: m[1] })
      },
      {
        regex: /^\[([^\]]+)\]\(([^)]+)\)/,
        handler: (m) => ({
          type: 'link',
          value: m[1],
          url: m[2],
          children: [{ type: 'text', value: m[1] }]
        })
      },
      {
        regex: /^\n/,
        handler: () => ({ type: 'lineBreak' })
      }
    ];

    while (remaining.length > 0) {
      let matched = false;

      for (const { regex, handler } of patterns) {
        const match = remaining.match(regex);
        if (match) {
          nodes.push(handler(match));
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        let textEnd = remaining.length;
        for (const { regex } of patterns) {
          const match = remaining.match(regex);
          if (match && (match.index ?? remaining.length) < textEnd) {
            textEnd = match.index ?? remaining.length;
          }
        }
        nodes.push({ type: 'text', value: remaining.slice(0, textEnd) });
        remaining = remaining.slice(textEnd);
      }
    }

    return nodes;
  }
}
