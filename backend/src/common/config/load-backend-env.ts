import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** `backend/.env` — same path from `src/common/config` and compiled `dist/common/config`. */
export function backendEnvFilePath(): string {
  return join(__dirname, '../../..', '.env');
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const body = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const eq = body.indexOf('=');
  if (eq <= 0) {
    return null;
  }
  const key = body.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  let value = body.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

/**
 * Load local `.env` before TypeORM reads `DB_*`.
 * `data-source.ts` is imported before `ConfigModule.forRoot`, so Nest dotenv is too late.
 * Existing process env wins (same as dotenv).
 */
export function loadBackendEnvFile(envPath: string = backendEnvFilePath()): void {
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
}
