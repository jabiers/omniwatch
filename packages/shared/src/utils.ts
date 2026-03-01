/** Standardized API error response shape */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

/** Create standardized error response body */
export function apiError(message: string, details?: unknown): ApiErrorResponse {
  if (details !== undefined) return { error: message, details };
  return { error: message };
}

/** Extract error message from unknown caught value */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Safely parse JSON with a fallback value */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
