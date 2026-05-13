import { TokenType } from './tokenizer.js';

const ASTNodeType = {
  Literal: 'Literal',
  Identifier: 'Identifier',
  TagCheck: 'TagCheck',
  Comparison: 'Comparison',
  Logical: 'Logical',
  Not: 'Not',
  Grouping: 'Grouping',
};

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse() {
    if (this.tokens.length === 1 && this.tokens[0].type === TokenType.EOF) {
      return null;
    }
    const ast = this.parseOr();
    if (this.current().type !== TokenType.EOF) {
      throw new Error(`Unexpected token at position ${this.current().pos}`);
    }
    return ast;
  }

  current() {
    return this.tokens[this.pos];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  match(...types) {
    for (const type of types) {
      if (this.current().type === type) {
        return this.advance();
      }
    }
    return null;
  }

  parseOr() {
    let left = this.parseAnd();
    
    while (this.match(TokenType.OP_OR)) {
      const operator = '||';
      const right = this.parseAnd();
      left = {
        type: ASTNodeType.Logical,
        operator,
        left,
        right,
      };
    }
    
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    
    while (this.match(TokenType.OP_AND)) {
      const operator = '&&';
      const right = this.parseNot();
      left = {
        type: ASTNodeType.Logical,
        operator,
        left,
        right,
      };
    }
    
    return left;
  }

  parseNot() {
    if (this.match(TokenType.OP_NOT)) {
      const operand = this.parseNot();
      return {
        type: ASTNodeType.Not,
        operand,
      };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parsePrimary();

    const compOp = this.match(
      TokenType.OP_GT,
      TokenType.OP_LT,
      TokenType.OP_GTE,
      TokenType.OP_LTE,
      TokenType.OP_EQ,
      TokenType.OP_NEQ
    );

    if (compOp) {
      const right = this.parsePrimary();
      
      if (left.type === ASTNodeType.Identifier && left.name === 'tag') {
        return {
          type: ASTNodeType.TagCheck,
          operator: compOp.value,
          tagValue: right,
        };
      }

      return {
        type: ASTNodeType.Comparison,
        operator: compOp.value,
        left,
        right,
      };
    }

    return left;
  }

  parsePrimary() {
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseOr();
      if (!this.match(TokenType.RPAREN)) {
        throw new Error('Missing closing parenthesis');
      }
      return {
        type: ASTNodeType.Grouping,
        expression: expr,
      };
    }

    const number = this.match(TokenType.NUMBER);
    if (number) {
      return {
        type: ASTNodeType.Literal,
        value: number.value,
        valueType: 'number',
      };
    }

    const string = this.match(TokenType.STRING);
    if (string) {
      return {
        type: ASTNodeType.Literal,
        value: string.value,
        valueType: 'string',
      };
    }

    const ident = this.match(TokenType.IDENTIFIER);
    if (ident) {
      return {
        type: ASTNodeType.Identifier,
        name: ident.value,
      };
    }

    throw new Error(`Unexpected token: ${this.current().value} at position ${this.current().pos}`);
  }
}

function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}

export { Parser, ASTNodeType, parse };
