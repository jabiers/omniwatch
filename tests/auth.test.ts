import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, isValidApiKeyFormat, API_KEY_PREFIX } from '@vigil/shared';

describe('Auth Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct prefix', () => {
      const key = generateApiKey();
      expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    });

    it('should generate a key with correct length', () => {
      const key = generateApiKey();
      // vigil_ (6) + 32 hex chars = 38
      expect(key.length).toBe(38);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    it('should only contain hex chars after prefix', () => {
      const key = generateApiKey();
      const hex = key.slice(API_KEY_PREFIX.length);
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });
  });

  describe('hashApiKey', () => {
    it('should return a SHA-256 hash (64 hex chars)', () => {
      const hash = hashApiKey('vigil_abc123');
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should produce consistent hashes', () => {
      const key = generateApiKey();
      expect(hashApiKey(key)).toBe(hashApiKey(key));
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('vigil_key1');
      const hash2 = hashApiKey('vigil_key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('should validate correctly formatted keys', () => {
      const key = generateApiKey();
      expect(isValidApiKeyFormat(key)).toBe(true);
    });

    it('should reject keys without prefix', () => {
      expect(isValidApiKeyFormat('abc123')).toBe(false);
    });

    it('should reject keys with wrong prefix', () => {
      expect(isValidApiKeyFormat('wrong_' + 'a'.repeat(32))).toBe(false);
    });

    it('should reject keys with wrong length', () => {
      expect(isValidApiKeyFormat('vigil_short')).toBe(false);
    });

    it('should reject keys with non-hex chars', () => {
      expect(isValidApiKeyFormat('vigil_' + 'g'.repeat(32))).toBe(false);
    });
  });
});
