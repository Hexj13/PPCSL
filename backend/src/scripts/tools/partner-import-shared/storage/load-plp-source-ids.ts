import * as fs from 'fs';

export function loadSourceIdsFromPlpFile(plpFilePath: string): Set<string> {
  if (!fs.existsSync(plpFilePath)) {
    throw new Error(`PLP file not found: ${plpFilePath}`);
  }
  const raw = fs.readFileSync(plpFilePath, 'utf-8');
  const parsed = JSON.parse(raw) as { items?: Record<string, unknown> };
  const entries = parsed.items ?? {};
  return new Set(Object.keys(entries));
}
