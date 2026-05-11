import React, { useMemo } from 'react';
import { Parser } from './Parser';
import { Renderer } from './Renderer';

export interface MarkdownViewProps {
  source: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ source, className }) => {
  const content = useMemo(() => {
    const parser = new Parser();
    const renderer = new Renderer();
    const ast = parser.parse(source);
    return renderer.render(ast);
  }, [source]);

  return <div className={className}>{content}</div>;
};
