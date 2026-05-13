import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { evaluate } from './evaluator.js';

function createRuleEngine() {
  return {
    compile(expression) {
      try {
        const tokens = tokenize(expression);
        const ast = parse(tokens);
        return {
          match: (product) => evaluate(ast, product),
          tokens,
          ast,
          error: null,
        };
      } catch (e) {
        return {
          match: () => false,
          tokens: [],
          ast: null,
          error: e.message,
        };
      }
    },

    filter(products, expression) {
      const compiled = this.compile(expression);
      if (compiled.error) {
        return { matched: [], error: compiled.error, tokens: compiled.tokens, ast: compiled.ast };
      }
      const matched = products.filter((product) => compiled.match(product));
      return { matched, error: null, tokens: compiled.tokens, ast: compiled.ast };
    },
  };
}

const ruleEngine = createRuleEngine();

export { tokenize, parse, evaluate, createRuleEngine, ruleEngine };
