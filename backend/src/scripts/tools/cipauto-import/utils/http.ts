import { withRetry } from './retry';
import { sleep } from './sleep';

interface HttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  delayAfterMs?: number;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
}

export async function requestJson<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const retries = options.retries ?? 3;
  const result = await withRetry(
    async () => {
      const response = await runFetch(options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `HTTP ${response.status} ${options.method ?? 'GET'} ${options.url}: ${text || response.statusText}`,
        );
      }
      const data = (await response.json()) as T;
      return { status: response.status, data };
    },
    { retries },
  );

  await sleep(options.delayAfterMs ?? 0);
  return result;
}

export async function requestText(options: HttpRequestOptions): Promise<HttpResponse<string>> {
  const retries = options.retries ?? 3;
  const result = await withRetry(
    async () => {
      const response = await runFetch(options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `HTTP ${response.status} ${options.method ?? 'GET'} ${options.url}: ${text || response.statusText}`,
        );
      }
      const data = await response.text();
      return { status: response.status, data };
    },
    { retries },
  );

  await sleep(options.delayAfterMs ?? 0);
  return result;
}

export async function requestBuffer(options: HttpRequestOptions): Promise<HttpResponse<Buffer>> {
  const retries = options.retries ?? 3;
  const result = await withRetry(
    async () => {
      const response = await runFetch(options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `HTTP ${response.status} ${options.method ?? 'GET'} ${options.url}: ${text || response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      return { status: response.status, data: Buffer.from(arrayBuffer) };
    },
    { retries },
  );

  await sleep(options.delayAfterMs ?? 0);
  return result;
}

async function runFetch(options: HttpRequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? 20000);

  try {
    return await fetch(options.url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body as never,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
