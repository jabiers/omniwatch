import * as acorn from 'acorn';
import { FORBIDDEN_APIS } from '../shared/constants.js';
import { log } from '../shared/logger.js';

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
  walkNode(ast, (node: any) => {
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

function walkNode(node: any, visitor: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walkNode(c, visitor));
    } else if (child && typeof child === 'object' && child.type) {
      walkNode(child, visitor);
    }
  }
}
