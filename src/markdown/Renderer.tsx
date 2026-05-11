import React from 'react';
import type { MarkdownNode } from './Parser';

export class Renderer {
  render(node: MarkdownNode, key?: number | string): React.ReactNode {
    switch (node.type) {
      case 'root':
        return this.renderChildren(node.children);

      case 'heading':
        return React.createElement(
          `h${node.level}`,
          { key },
          this.renderChildren(node.children)
        );

      case 'paragraph':
        return React.createElement('p', { key }, this.renderChildren(node.children));

      case 'list':
        const ListTag = node.ordered ? 'ol' : 'ul';
        return React.createElement(ListTag, { key }, this.renderChildren(node.children));

      case 'listItem':
        return React.createElement('li', { key }, this.renderChildren(node.children));

      case 'blockquote':
        return React.createElement('blockquote', { key }, this.renderChildren(node.children));

      case 'text':
        return node.value;

      case 'bold':
        return React.createElement('strong', { key }, this.renderChildren(node.children));

      case 'italic':
        return React.createElement('em', { key }, this.renderChildren(node.children));

      case 'code':
        return React.createElement('code', { key }, node.value);

      case 'link':
        return React.createElement(
          'a',
          { key, href: node.url, target: '_blank', rel: 'noopener noreferrer' },
          this.renderChildren(node.children)
        );

      case 'lineBreak':
        return React.createElement('br', { key });

      default:
        return null;
    }
  }

  private renderChildren(children?: MarkdownNode[]): React.ReactNode[] {
    if (!children) return [];
    return children.map((child, index) => this.render(child, index));
  }
}
