import * as path from 'node:path';

import { resolveParsingRuntimeRoot } from '../../common/parsing-runtime-path';

import { getParserCatalogItem } from './parser-catalog';

export function toLoginFileSlug(login: string): string {
  const normalized = login.trim().toLowerCase();
  if (!normalized) {
    return 'unknown-login';
  }
  return normalized.replace(/[^a-z0-9_-]+/g, '-');
}

export function normalizeSyncPlpFileKey(fileKey: string): string {
  const t = fileKey.trim();
  const base = path.basename(t);
  return base.endsWith('.json') ? base : `${base}.json`;
}

export function get999mdCurrentPlpDir(): string {
  return path.join(resolveParsingRuntimeRoot(), '999md', 'current-plp');
}

export function resolveParserPlpDataPath(plpDataPath: string): string {
  if (path.isAbsolute(plpDataPath)) {
    return plpDataPath;
  }
  if (plpDataPath.startsWith('runtime/parsing/')) {
    const tail = plpDataPath.slice('runtime/parsing/'.length);
    return path.join(resolveParsingRuntimeRoot(), tail);
  }
  return path.join(process.cwd(), 'src', 'scripts', 'tools', plpDataPath);
}

export function resolveS3RelativePath(parserCode: string, fileKey: string): string {
  if (parserCode === '999md') {
    const safeKey = fileKey === 'default' ? 'default.json' : path.basename(fileKey);
    return `999md/current-plp/${safeKey}`;
  }
  const parser = getParserCatalogItem(parserCode);
  if (parser?.plpDataPath) {
    const parts = parser.plpDataPath.replace(/^runtime\/parsing\//, '');
    return parts;
  }
  return `${parserCode}/${fileKey}.json`;
}

export function getParserReportsDir(parserCode: string): string | null {
  const parser = getParserCatalogItem(parserCode);
  if (!parser?.cliScript) {
    return null;
  }
  return path.join(resolveParsingRuntimeRoot(), parserCode, 'reports');
}
