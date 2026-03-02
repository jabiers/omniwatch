import * as acorn from 'acorn';
import { FORBIDDEN_APIS, log } from '@omniwatch/shared';

/** Extended AST node with common properties used by the validator */
type AstNode = acorn.Node & Record<string, unknown>;

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateCode(code: string): ValidationResult {
  const issues: string[] = [];

  // Step 1: Parse AST
  let ast: acorn.Node;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  } catch (err) {
    issues.push(`Syntax error: ${err instanceof Error ? err.message : String(err)}`);
    return { valid: false, issues };
  }

  // Step 2: Walk AST to find violations
  walkNode(ast as AstNode, (node: AstNode, depth: number) => {
    // Check import declarations
    if (node.type === 'ImportDeclaration') {
      const source = node.source as AstNode | undefined;
      if (typeof source?.value === 'string' && FORBIDDEN_APIS.includes(source.value as string)) {
        issues.push(`Forbidden import: '${source.value}' is not allowed`);
      }
    }

    // Check call expressions
    if (node.type === 'CallExpression') {
      const callee = node.callee as AstNode;
      // eval()
      if (callee.type === 'Identifier' && callee.name === 'eval') {
        issues.push('eval() is not allowed');
      }
      // require()
      if (callee.type === 'Identifier' && callee.name === 'require') {
        issues.push('require() is not allowed, use import');
      }
      // process.exit()
      if (callee.type === 'MemberExpression') {
        const obj = callee.object as AstNode | undefined;
        const prop = callee.property as AstNode | undefined;
        if (
          obj?.type === 'Identifier' &&
          obj.name === 'process' &&
          prop?.type === 'Identifier' &&
          prop.name === 'exit'
        ) {
          issues.push('process.exit() is not allowed');
        }
      }
    }

    // Check new Function()
    if (node.type === 'NewExpression') {
      const callee = node.callee as AstNode;
      if (callee.type === 'Identifier' && callee.name === 'Function') {
        issues.push('new Function() is not allowed');
      }
    }

    // Detect infinite loops: while(true), for(;;)
    if (node.type === 'WhileStatement' && isAlwaysTruthy(node.test as AstNode)) {
      if (!hasBreakOrReturn(node.body as AstNode)) {
        issues.push('Potential infinite loop: while(true) without break/return');
      }
    }
    if (node.type === 'ForStatement' && !node.test) {
      if (!hasBreakOrReturn(node.body as AstNode)) {
        issues.push('Potential infinite loop: for(;;) without break/return');
      }
    }

    // Detect dynamic access to forbidden APIs: globalThis['eval']
    if (node.type === 'MemberExpression' && node.computed) {
      const prop = node.property as AstNode | undefined;
      if (
        prop?.type === 'Literal' &&
        typeof prop.value === 'string' &&
        FORBIDDEN_APIS.includes(prop.value as string)
      ) {
        issues.push(`Dynamic access to forbidden API: '${prop.value}'`);
      }
    }

    // Warn on excessive nesting depth
    if (depth > 10 && (node.type === 'BlockStatement' || node.type === 'ArrowFunctionExpression')) {
      issues.push(`Excessive nesting depth (${depth}): code may be too complex`);
    }
  });

  // Step 3: Check for default export
  let hasDefaultExport = false;
  walkNode(ast as AstNode, (node: AstNode) => {
    if (node.type === 'ExportDefaultDeclaration') hasDefaultExport = true;
  });
  if (!hasDefaultExport) {
    issues.push('Agent must have a default export function');
  }

  if (issues.length > 0) {
    log('warn', `AST validation found ${issues.length} issue(s)`, { issues });
  }

  return { valid: issues.length === 0, issues };
}

function walkNode(node: AstNode, visitor: (node: AstNode, depth: number) => void, depth = 0): void {
  if (!node || typeof node !== 'object') return;
  visitor(node, depth);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walkNode(c as AstNode, visitor, depth + 1));
    } else if (child && typeof child === 'object' && (child as AstNode).type) {
      walkNode(child as AstNode, visitor, depth + 1);
    }
  }
}

/** Check if an expression is always truthy (true, 1, non-zero literal) */
function isAlwaysTruthy(node: AstNode): boolean {
  if (!node) return false;
  if (node.type === 'Literal') {
    return !!node.value;
  }
  if (node.type === 'Identifier' && node.name === 'true') return true;
  return false;
}

/** Check if a block contains break or return statements */
function hasBreakOrReturn(node: AstNode): boolean {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'BreakStatement' || node.type === 'ReturnStatement') return true;
  if (node.type === 'IfStatement') {
    return (
      hasBreakOrReturn(node.consequent as AstNode) || hasBreakOrReturn(node.alternate as AstNode)
    );
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      if (child.some((c) => hasBreakOrReturn(c as AstNode))) return true;
    } else if (child && typeof child === 'object' && (child as AstNode).type) {
      if (hasBreakOrReturn(child as AstNode)) return true;
    }
  }
  return false;
}
