import type { Event } from '@sentry/nextjs';

const JSON_PARSE_TRAILING_NOISE = 'Unexpected non-whitespace character after JSON';
const TURBOPACK_WORKER_CHUNK = 'turbopack-worker-';

export function shouldSuppressWebKitStacklessXdNoise(event: Event): boolean {
  const exc = event.exception?.values?.[0];
  if (!exc || exc.type !== 'Error' || exc.value !== 'Xd') return false;
  const frames = exc.stacktrace?.frames ?? [];
  if (frames.length > 0) return false;
  if (event.contexts?.os?.name !== 'iOS') return false;
  const browserName = String(event.contexts?.browser?.name ?? '');
  if (!browserName.includes('Chrome Mobile iOS')) return false;
  const mech = exc.mechanism;
  const mechSerialized = mech ? JSON.stringify(mech) : '';
  if (!mechSerialized.toLowerCase().includes('unhandledrejection')) return false;
  return true;
}

function frameMentionsTurbopackWorker(frame: {
  filename?: string | null;
  abs_path?: string | null;
}): boolean {
  return (
    (frame.filename ?? '').includes(TURBOPACK_WORKER_CHUNK) ||
    (frame.abs_path ?? '').includes(TURBOPACK_WORKER_CHUNK)
  );
}

export function shouldSuppressTurbopackWorkerJsonParseNoise(event: Event): boolean {
  const values = event.exception?.values ?? [];
  return values.some(
    (exc) =>
      (exc.value ?? '').includes(JSON_PARSE_TRAILING_NOISE) &&
      (exc.stacktrace?.frames ?? []).some(frameMentionsTurbopackWorker),
  );
}
