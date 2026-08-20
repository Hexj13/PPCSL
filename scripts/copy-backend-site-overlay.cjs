#!/usr/bin/env node
'use strict';

/**
 * Copy platform `config/site.ts` into the backend overlay slot.
 * Run from the platform repository root (cwd). A bare PPCSL checkout
 * has no `config/site.ts` — exit 0 without writing.
 *
 * Strips `SiteConfig` types so the backend overlay is a plain TS module.
 */

const fs = require('fs');
const path = require('path');

const platformRoot = process.cwd();
const from = path.join(platformRoot, 'config/site.ts');
const to = path.join(platformRoot, 'core/backend/src/common/config/site.ts');

if (!fs.existsSync(from)) {
  process.exit(0);
}

const next = fs
  .readFileSync(from, 'utf8')
  .replace(/import type \{ SiteConfig \} from ['"]\.\.\/site-config['"];\r?\n+/g, '')
  .replace(/const config:\s*SiteConfig\s*=/, 'const config =');

if (next.includes('../site-config') || /\bSiteConfig\b/.test(next)) {
  console.error('Failed to strip SiteConfig types from config/site.ts for backend overlay');
  process.exit(1);
}

let changed = true;
try {
  changed = fs.readFileSync(to, 'utf8') !== next;
} catch {
  changed = true;
}

if (changed) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, next);
}
