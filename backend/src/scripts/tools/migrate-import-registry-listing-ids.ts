/**
 * One-shot rewrite of partner-import JSON registries:
 * `kupitoListingId` → `platformListingId`.
 *
 * Usage:
 *   npx ts-node src/scripts/tools/migrate-import-registry-listing-ids.ts /path/to/registry.json
 *   npx ts-node src/scripts/tools/migrate-import-registry-listing-ids.ts /path/to/dir
 */
import * as fs from 'fs';
import * as path from 'path';

import { migrateRegistryDataListingIds } from './partner-import-shared/legacy-registry-fields';

function collectJsonFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return target.endsWith('.json') ? [target] : [];
  }
  const out: string[] = [];
  for (const ent of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectJsonFiles(full));
    } else if (ent.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function migrateFile(filePath: string): boolean {
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.trim()) {
    return false;
  }
  const parsed = JSON.parse(raw) as { items?: Record<string, unknown> };
  if (!parsed.items || typeof parsed.items !== 'object') {
    return false;
  }
  const before = JSON.stringify(parsed);
  migrateRegistryDataListingIds(parsed);
  const after = JSON.stringify(parsed);
  if (before === after) {
    return false;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
  return true;
}

function main(): void {
  const target = process.argv[2];
  if (!target) {
    throw new Error('Usage: migrate-import-registry-listing-ids.ts <file-or-dir>');
  }
  const files = collectJsonFiles(path.resolve(target));
  let changed = 0;
  for (const file of files) {
    if (migrateFile(file)) {
      changed += 1;
      console.log(`migrated ${file}`);
    }
  }
  console.log(`updated ${changed} of ${files.length} json files`);
}

main();
