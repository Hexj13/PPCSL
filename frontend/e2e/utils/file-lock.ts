import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function withFileLock<T>(
  name: string,
  fn: () => Promise<T>,
  timeoutMs = 180_000,
): Promise<T> {
  const lockPath = path.join(process.cwd(), 'test-results', `.lock-${name}`);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(fd, `${process.pid}:${Date.now()}`);
      } finally {
        fs.closeSync(fd);
      }
      try {
        return await fn();
      } finally {
        fs.unlinkSync(lockPath);
      }
    } catch {
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for lock: ${name}`);
}
