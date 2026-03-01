import { describe, it, expect, vi } from 'vitest';

// Mock logger before importing the module under test
vi.mock('@vigil/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vigil/shared')>();
  return { ...actual, log: vi.fn() };
});

import { validateCode } from '../apps/daemon/src/code-validator.js';

describe('validateCode', () => {
  const validCode = `
import vigil from 'vigil';

export default async function(sdk) {
  const res = await sdk.fetch('https://example.com');
  sdk.log.info('ok');
}
`;

  it('passes valid code', () => {
    const result = validateCode(validCode);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects forbidden imports (fs)', () => {
    const code = `import { readFile } from 'fs'\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('fs'))).toBe(true);
  });

  it('rejects forbidden imports (child_process)', () => {
    const code = `import { exec } from 'child_process'\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('child_process'))).toBe(true);
  });

  it('rejects require calls', () => {
    const code = `const fs = require('fs')\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('require'))).toBe(true);
  });

  it('rejects eval()', () => {
    const code = `eval('bad')\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('eval'))).toBe(true);
  });

  it('rejects new Function()', () => {
    const code = `new Function('return 1')\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('Function'))).toBe(true);
  });

  it('rejects process.exit()', () => {
    const code = `process.exit(1)\nexport default function() {}`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('process.exit'))).toBe(true);
  });

  it('requires default export', () => {
    const code = `function run() { return 1; }`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('default export'))).toBe(true);
  });

  it('collects multiple issues', () => {
    const code = `import { exec } from 'child_process'\neval('bad')`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(3); // child_process + eval + no export
  });
});
