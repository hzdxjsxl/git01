import { ASTNodeType } from './parser.js';

class Evaluator {
  evaluate(ast, product) {
    if (ast === null) {
      return true;
    }
    return this.evaluateNode(ast, product);
  }

  evaluateNode(node, product) {
    switch (node.type) {
      case ASTNodeType.Literal:
        return node.value;

      case ASTNodeType.Identifier:
        return this.getProductField(product, node.name);

      case ASTNodeType.TagCheck:
        return this.evaluateTagCheck(node, product);

      case ASTNodeType.Comparison:
        return this.evaluateComparison(node, product);

      case ASTNodeType.Logical:
        return this.evaluateLogical(node, product);

      case ASTNodeType.Not:
        return !this.evaluateNode(node.operand, product);

      case ASTNodeType.Grouping:
        return this.evaluateNode(node.expression, product);

      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  getProductField(product, fieldName) {
    if (fieldName in product) {
      return product[fieldName];
    }
    return undefined;
  }

  evaluateTagCheck(node, product) {
    const tagValue = this.evaluateNode(node.tagValue, product);
    const tags = product.tags || [];
    const hasTag = tags.includes(tagValue);

    switch (node.operator) {
      case '==':
        return hasTag;
      case '!=':
        return !hasTag;
      default:
        throw new Error(`Invalid operator for tag check: ${node.operator}`);
    }
  }

  evaluateComparison(node, product) {
    const left = this.evaluateNode(node.left, product);
    const right = this.evaluateNode(node.right, product);

    switch (node.operator) {
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      default:
        throw new Error(`Unknown comparison operator: ${node.operator}`);
    }
  }

  evaluateLogical(node, product) {
    const left = this.evaluateNode(node.left, product);

    switch (node.operator) {
      case '&&':
        if (!left) return false;
        return this.evaluateNode(node.right, product);
      case '||':
        if (left) return true;
        return this.evaluateNode(node.right, product);
      default:
        throw new Error(`Unknown logical operator: ${node.operator}`);
    }
  }
}

function evaluate(ast, product) {
  const evaluator = new Evaluator();
  return evaluator.evaluate(ast, product);
}

export { Evaluator, evaluate };
