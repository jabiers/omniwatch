/** Auth utilities — API key generation and hashing */
import { createHash, randomBytes } from 'node:crypto';
import { API_KEY_PREFIX, API_KEY_LENGTH } from './constants.js';

/** Generate a new API key: vigil_ + 32 random hex chars */
export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(API_KEY_LENGTH / 2).toString('hex');
}

/** Hash an API key using SHA-256 for storage */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/** Validate API key format */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const hexPart = apiKey.slice(API_KEY_PREFIX.length);
  return (
    apiKey.startsWith(API_KEY_PREFIX) &&
    hexPart.length === API_KEY_LENGTH &&
    /^[0-9a-f]+$/.test(hexPart)
  );
}
