const TokenType = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  OP_GT: 'OP_GT',
  OP_LT: 'OP_LT',
  OP_GTE: 'OP_GTE',
  OP_LTE: 'OP_LTE',
  OP_EQ: 'OP_EQ',
  OP_NEQ: 'OP_NEQ',
  OP_AND: 'OP_AND',
  OP_OR: 'OP_OR',
  OP_NOT: 'OP_NOT',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF',
};

class Tokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      if (/\d/.test(char)) {
        this.readNumber();
        continue;
      }

      if (char === "'" || char === '"') {
        this.readString(char);
        continue;
      }

      if (char === '(') {
        this.addToken(TokenType.LPAREN, '(');
        this.pos++;
        continue;
      }

      if (char === ')') {
        this.addToken(TokenType.RPAREN, ')');
        this.pos++;
        continue;
      }

      if (char === '>') {
        this.readGt();
        continue;
      }

      if (char === '<') {
        this.readLt();
        continue;
      }

      if (char === '=') {
        this.readEq();
        continue;
      }

      if (char === '!') {
        this.readNeq();
        continue;
      }

      if (char === '&') {
        this.readAnd();
        continue;
      }

      if (char === '|') {
        this.readOr();
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        this.readIdentifier();
        continue;
      }

      throw new Error(`Unexpected character: ${char} at position ${this.pos}`);
    }

    this.addToken(TokenType.EOF, null);
    return this.tokens;
  }

  readNumber() {
    const start = this.pos;
    while (this.pos < this.input.length && /\d/.test(this.input[this.pos])) {
      this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    this.addToken(TokenType.NUMBER, parseFloat(value));
  }

  readString(quote) {
    this.pos++;
    const start = this.pos;
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    this.addToken(TokenType.STRING, value);
    this.pos++;
  }

  readIdentifier() {
    const start = this.pos;
    while (
      this.pos < this.input.length &&
      /[a-zA-Z0-9_]/.test(this.input[this.pos])
    ) {
      this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    this.addToken(TokenType.IDENTIFIER, value);
  }

  readGt() {
    if (this.input[this.pos + 1] === '=') {
      this.addToken(TokenType.OP_GTE, '>=');
      this.pos += 2;
    } else {
      this.addToken(TokenType.OP_GT, '>');
      this.pos++;
    }
  }

  readLt() {
    if (this.input[this.pos + 1] === '=') {
      this.addToken(TokenType.OP_LTE, '<=');
      this.pos += 2;
    } else {
      this.addToken(TokenType.OP_LT, '<');
      this.pos++;
    }
  }

  readEq() {
    if (this.input[this.pos + 1] === '=') {
      this.addToken(TokenType.OP_EQ, '==');
      this.pos += 2;
    } else {
      throw new Error(`Expected '==', got '=' at position ${this.pos}`);
    }
  }

  readNeq() {
    if (this.input[this.pos + 1] === '=') {
      this.addToken(TokenType.OP_NEQ, '!=');
      this.pos += 2;
    } else {
      this.addToken(TokenType.OP_NOT, '!');
      this.pos++;
    }
  }

  readAnd() {
    if (this.input[this.pos + 1] === '&') {
      this.addToken(TokenType.OP_AND, '&&');
      this.pos += 2;
    } else {
      throw new Error(`Expected '&&', got '&' at position ${this.pos}`);
    }
  }

  readOr() {
    if (this.input[this.pos + 1] === '|') {
      this.addToken(TokenType.OP_OR, '||');
      this.pos += 2;
    } else {
      throw new Error(`Expected '||', got '|' at position ${this.pos}`);
    }
  }

  addToken(type, value) {
    this.tokens.push({ type, value, pos: this.pos });
  }
}

function tokenize(input) {
  const tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
}

export { Tokenizer, TokenType, tokenize };
