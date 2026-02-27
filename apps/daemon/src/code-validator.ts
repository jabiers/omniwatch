import * as acorn from 'acorn';
import { FORBIDDEN_APIS, log } from '@omniwatch/shared';

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
  walkNode(ast, (node: any, depth: number) => {
    // Check import declarations
    if (node.type === 'ImportDeclaration' && typeof node.source?.value === 'string') {
      if (FORBIDDEN_APIS.includes(node.source.value)) {
        issues.push(`Forbidden import: '${node.source.value}' is not allowed`);
      }
    }

    // Check call expressions
    if (node.type === 'CallExpression') {
      // eval()
      if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
        issues.push('eval() is not allowed');
      }
      // require()
      if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
        issues.push('require() is not allowed, use import');
      }
      // process.exit()
      if (node.callee.type === 'MemberExpression'
          && node.callee.object?.type === 'Identifier'
          && node.callee.object.name === 'process'
          && node.callee.property?.type === 'Identifier'
          && node.callee.property.name === 'exit') {
        issues.push('process.exit() is not allowed');
      }
    }

    // Check new Function()
    if (node.type === 'NewExpression'
        && node.callee.type === 'Identifier'
        && node.callee.name === 'Function') {
      issues.push('new Function() is not allowed');
    }

    // Detect infinite loops: while(true), for(;;)
    if (node.type === 'WhileStatement' && isAlwaysTruthy(node.test)) {
      if (!hasBreakOrReturn(node.body)) {
        issues.push('Potential infinite loop: while(true) without break/return');
      }
    }
    if (node.type === 'ForStatement' && !node.test) {
      if (!hasBreakOrReturn(node.body)) {
        issues.push('Potential infinite loop: for(;;) without break/return');
      }
    }

    // Detect dynamic access to forbidden APIs: globalThis['eval']
    if (node.type === 'MemberExpression'
        && node.computed
        && node.property?.type === 'Literal'
        && typeof node.property.value === 'string'
        && FORBIDDEN_APIS.includes(node.property.value)) {
      issues.push(`Dynamic access to forbidden API: '${node.property.value}'`);
    }

    // Warn on excessive nesting depth
    if (depth > 10 && (node.type === 'BlockStatement' || node.type === 'ArrowFunctionExpression')) {
      issues.push(`Excessive nesting depth (${depth}): code may be too complex`);
    }
  });

  // Step 3: Check for default export
  let hasDefaultExport = false;
  walkNode(ast, (node: any) => {
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

function walkNode(node: any, visitor: (node: any, depth: number) => void, depth = 0): void {
  if (!node || typeof node !== 'object') return;
  visitor(node, depth);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walkNode(c, visitor, depth + 1));
    } else if (child && typeof child === 'object' && child.type) {
      walkNode(child, visitor, depth + 1);
    }
  }
}

// Check if an expression is always truthy (true, 1, non-zero literal)
function isAlwaysTruthy(node: any): boolean {
  if (!node) return false;
  if (node.type === 'Literal') {
    return !!node.value;
  }
  if (node.type === 'Identifier' && node.name === 'true') return true;
  return false;
}

// Check if a block contains break or return statements
function hasBreakOrReturn(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'BreakStatement' || node.type === 'ReturnStatement') return true;
  // Check if/else branches, await expressions with break, etc.
  if (node.type === 'IfStatement') {
    return hasBreakOrReturn(node.consequent) || hasBreakOrReturn(node.alternate);
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      if (child.some((c: any) => hasBreakOrReturn(c))) return true;
    } else if (child && typeof child === 'object' && child.type) {
      if (hasBreakOrReturn(child)) return true;
    }
  }
  return false;
}
