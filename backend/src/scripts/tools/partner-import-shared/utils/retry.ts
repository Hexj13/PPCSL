import { sleep } from './sleep';

interface RetryOptions {
  retries: number;
  baseDelayMs?: number;
  factor?: number;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const retries = Math.max(1, options.retries);
  const baseDelayMs = options.baseDelayMs ?? 5000;
  const factor = options.factor ?? 2;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      const delayMs = Math.round(baseDelayMs * Math.pow(factor, attempt - 1));
      options.onRetry?.(attempt, error, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
