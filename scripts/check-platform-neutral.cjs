#!/usr/bin/env node
'use strict';

/**
 * Fail if shared core source names a live PPCSL platform.
 *
 * Overlay copy (locales, FAQ, legal, theme, assets) is skipped: that brand
 * belongs in the platform repo. Documented code exceptions are stripped per line
 * (Infocar `from=kupito`, deprecated `KUPITO_*` env aliases, `kupitoListingId`).
 *
 * When launching a new platform, add its brand/domain token to FORBIDDEN.
 */

const fs = require('fs');
const path = require('path');

const CORE_ROOT = path.resolve(__dirname, '..');

const FORBIDDEN = ['kupito', 'makinaguru'];
const FORBIDDEN_RE = new RegExp(FORBIDDEN.join('|'), 'gi');

const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
]);

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'coverage-integration',
  'playwright-report',
  'test-results',
  'allure-report',
  'allure-results',
  'storybook-static',
  '.git',
]);

const SKIP_REL_EXACT = new Set([
  'scripts/check-platform-neutral.cjs',
  'frontend/e2e/platform/contract.test.ts',
  'frontend/lib/theme/colors.ts',
  'backend/src/common/config/site.ts',
  'backend/src/common/config/parsers.ts',
  'backend/src/common/i18n/en.json',
  'backend/src/common/i18n/sq.json',
]);

const SKIP_REL_PREFIXES = [
  'frontend/lib/locales/',
  'frontend/public/',
  'backend/assets/watermark/',
];

const OVERLAY_CONFIG_KEEP = new Set([
  'frontend/lib/config/parsers.ts',
  'frontend/lib/config/parser-types.ts',
  'frontend/lib/config/faq-types.ts',
  'frontend/lib/config/popular-brands.json',
  'frontend/lib/config/popular-brands-moto.json',
  'frontend/lib/config/popular-brands-truck.json',
]);

const ALLOW_STRIP = [
  /from=kupito/gi,
  /partnerFrom:\s*['"]kupito['"]/gi,
  /DEFAULT_PARTNER_FROM\s*=\s*['"]kupito['"]/gi,
  /INFOCAR_PARTNER_FROM:\s*['"]kupito['"]/gi,
  /ADMIN_PARSING_KUPITO_[A-Z0-9_]*/g,
  /KUPITO_[A-Z0-9_]+/g,
  /kupitoListingId/g,
];

const LINE_ALLOW_MARKER = 'ppcsl-allow-platform-name';

function posixRel(absPath) {
  return path.relative(CORE_ROOT, absPath).split(path.sep).join('/');
}

function shouldSkipRel(rel) {
  if (SKIP_REL_EXACT.has(rel)) return true;
  if (SKIP_REL_PREFIXES.some((prefix) => rel.startsWith(prefix))) return true;
  if (rel.startsWith('frontend/lib/config/') && !OVERLAY_CONFIG_KEEP.has(rel)) {
    return true;
  }
  if (rel === 'frontend/app/favicon.ico' || rel === 'frontend/app/icon.png') {
    return true;
  }
  return false;
}

function stripAllowed(line) {
  let next = line;
  for (const pattern of ALLOW_STRIP) {
    pattern.lastIndex = 0;
    next = next.replace(pattern, '');
  }
  return next;
}

function collectFiles(absDir, out) {
  if (!fs.existsSync(absDir)) return;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      collectFiles(path.join(absDir, ent.name), out);
      continue;
    }
    if (!ent.isFile()) continue;
    const abs = path.join(absDir, ent.name);
    const rel = posixRel(abs);
    const ext = path.extname(ent.name);
    const isI18nJson =
      rel.startsWith('backend/src/common/i18n/') && ext === '.json';
    if (!EXTENSIONS.has(ext) && !isI18nJson) continue;
    if (shouldSkipRel(rel)) continue;
    out.push(abs);
  }
}

function scanFile(absPath) {
  const rel = posixRel(absPath);
  const text = fs.readFileSync(absPath, 'utf8');
  if (text.includes('\u0000')) return [];
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes(LINE_ALLOW_MARKER)) continue;
    const remainder = stripAllowed(line);
    FORBIDDEN_RE.lastIndex = 0;
    if (!FORBIDDEN_RE.test(remainder)) continue;
    hits.push({
      rel,
      line: i + 1,
      text: line.trim().slice(0, 200),
    });
  }
  return hits;
}

function resolveScope(arg) {
  if (arg === 'frontend') return [path.join(CORE_ROOT, 'frontend')];
  if (arg === 'backend') return [path.join(CORE_ROOT, 'backend')];
  if (!arg) {
    return [path.join(CORE_ROOT, 'frontend'), path.join(CORE_ROOT, 'backend')];
  }
  console.error('Usage: check-platform-neutral.cjs [frontend|backend]');
  process.exit(2);
}

function main() {
  const roots = resolveScope(process.argv[2]);
  const files = [];
  for (const root of roots) {
    collectFiles(root, files);
  }
  const hits = files.flatMap(scanFile);
  if (hits.length === 0) {
    return;
  }
  console.error(
    'Platform-neutral core check failed. Shared core must not name a live platform (brand/domain). Use SITE_NAME / overlay / {siteName}, or ppcsl_* identifiers. Allowed exceptions: Infocar from=kupito, deprecated KUPITO_* env aliases, kupitoListingId, e2e/platform/contract.test.ts. Inline escape: ppcsl-allow-platform-name on the line.',
  );
  for (const hit of hits) {
    console.error(`${hit.rel}:${hit.line}: ${hit.text}`);
  }
  process.exit(1);
}

main();
