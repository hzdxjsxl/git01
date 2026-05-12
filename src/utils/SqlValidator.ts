export interface SqlValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export class SqlValidator {
  private static readonly KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'TABLE', 'DROP', 'ALTER', 'TRUNCATE',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
    'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT',
    'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'EXISTS',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'UNIQUE', 'NOT', 'CHECK', 'DEFAULT', 'AUTOINCREMENT',
    'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
    'UNION', 'ALL', 'EXCEPT', 'INTERSECT'
  ];

  private static readonly DANGEROUS_KEYWORDS = [
    'DROP', 'TRUNCATE', 'DELETE'
  ];

  static validate(sql: string): SqlValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    const trimmedSql = sql.trim();

    if (!trimmedSql) {
      return { isValid: false, warnings: [], errors: ['SQL 语句不能为空'] };
    }

    if (trimmedSql.endsWith(';')) {
      // 允许以分号结尾
    } else {
      // 也允许不以分号结尾，但给个警告
      warnings.push('建议 SQL 语句以分号结尾');
    }

    const cleanedSql = trimmedSql.replace(/;$/, '');
    const statements = cleanedSql.split(/;\s*(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (statements.length > 1) {
      warnings.push('检测到多条 SQL 语句，将按顺序执行');
    }

    for (const statement of statements) {
      const upperStatement = statement.toUpperCase();
      const tokens = this.tokenize(statement);

      if (!tokens || tokens.length === 0) {
        continue;
      }

      const firstToken = tokens[0].toUpperCase();

      if (!this.isValidFirstKeyword(firstToken)) {
        errors.push(`无效的 SQL 语句: ${statement.substring(0, 50)}...`);
        continue;
      }

      if (this.DANGEROUS_KEYWORDS.some(kw => upperStatement.includes(kw))) {
        if (!upperStatement.includes('WHERE') && upperStatement.includes('DELETE')) {
          warnings.push('警告: DELETE 语句没有 WHERE 条件，将删除所有数据');
        }
        if (upperStatement.includes('DROP')) {
          warnings.push('警告: 这是一个 DROP 操作，数据将无法恢复');
        }
      }

      if (upperStatement.includes('SELECT')) {
        if (!upperStatement.includes('FROM')) {
          errors.push('SELECT 语句缺少 FROM 子句');
        }
      }

      if (upperStatement.includes('INSERT')) {
        if (!upperStatement.includes('INTO')) {
          errors.push('INSERT 语句缺少 INTO 关键字');
        }
        if (!upperStatement.includes('VALUES')) {
          errors.push('INSERT 语句缺少 VALUES 子句');
        }
      }

      if (upperStatement.includes('UPDATE') && !upperStatement.includes('SET')) {
        errors.push('UPDATE 语句缺少 SET 子句');
      }

      const parenthesisBalance = this.checkParenthesisBalance(statement);
      if (parenthesisBalance !== 0) {
        errors.push('括号不匹配');
      }

      const quoteBalance = this.checkQuoteBalance(statement);
      if (quoteBalance !== 0) {
        errors.push('引号不匹配');
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  private static tokenize(sql: string): string[] {
    const tokens: string[] = [];
    const regex = /(\b\w+\b|[(),;'"]|==|<=|>=|!=|<|>|=|\+|-|\*|\/)/g;
    let match;
    while ((match = regex.exec(sql)) !== null) {
      tokens.push(match[0]);
    }
    return tokens;
  }

  private static isValidFirstKeyword(keyword: string): boolean {
    const validStartKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE',
      'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
      'BEGIN', 'COMMIT', 'ROLLBACK', 'PRAGMA'
    ];
    return validStartKeywords.includes(keyword);
  }

  private static checkParenthesisBalance(sql: string): number {
    let balance = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];

      if (char === '"' || char === "'") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(') balance++;
        if (char === ')') balance--;
      }
    }

    return balance;
  }

  private static checkQuoteBalance(sql: string): number {
    let singleQuoteCount = 0;
    let doubleQuoteCount = 0;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      if (char === "'") singleQuoteCount++;
      if (char === '"') doubleQuoteCount++;
    }

    return (singleQuoteCount % 2) + (doubleQuoteCount % 2);
  }
}
