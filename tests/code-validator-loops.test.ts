import { describe, it, expect } from 'vitest';
import { validateCode } from '../src/daemon/code-validator.js';

describe('Code Validator - Loop Detection', () => {
  it('should detect while(true) without break', () => {
    const code = `export default async function(omni) {
      while (true) {
        console.log('infinite');
      }
    }`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(true);
  });

  it('should allow while(true) with break', () => {
    const code = `export default async function(omni) {
      while (true) {
        const data = await omni.fetch('http://example.com');
        if (data.ok) break;
      }
    }`;
    const result = validateCode(code);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(false);
  });

  it('should allow while(true) with return', () => {
    const code = `export default async function(omni) {
      while (true) {
        const data = await omni.fetch('http://example.com');
        if (data.ok) return;
      }
    }`;
    const result = validateCode(code);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(false);
  });

  it('should detect for(;;) without break', () => {
    const code = `export default async function(omni) {
      for (;;) {
        console.log('infinite');
      }
    }`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(true);
  });

  it('should allow for(;;) with break', () => {
    const code = `export default async function(omni) {
      for (;;) {
        if (Math.random() > 0.5) break;
      }
    }`;
    const result = validateCode(code);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(false);
  });

  it('should detect dynamic access to forbidden APIs', () => {
    const code = `export default async function(omni) {
      globalThis['eval']('alert()');
    }`;
    const result = validateCode(code);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('Dynamic access'))).toBe(true);
  });

  it('should allow normal while loops with condition', () => {
    const code = `export default async function(omni) {
      let i = 0;
      while (i < 10) {
        i++;
      }
    }`;
    const result = validateCode(code);
    expect(result.issues.some(i => i.includes('infinite loop'))).toBe(false);
  });
});
