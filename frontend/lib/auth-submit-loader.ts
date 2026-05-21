export const AUTH_SUBMIT_LOADER_MIN_MS = 1000;

export function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForAuthSubmitLoaderMinDisplay(
  startedAt: number | null,
  minMs = AUTH_SUBMIT_LOADER_MIN_MS,
): Promise<void> {
  const start = startedAt ?? Date.now();
  const elapsed = Date.now() - start;
  await sleepMs(Math.max(0, minMs - elapsed));
}
