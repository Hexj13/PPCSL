#!/usr/bin/env node
'use strict';

/**
 * Fail if markdown docs use a filename other than kebab-case or README.md.
 *
 * Scans core docs trees and, when this repo is a submodule, the platform
 * overlay `docs/` directory. Placeholder names (notes.md, temp.md, new-doc.md)
 * are always invalid.
 */

const fs = require('fs');
const path = require('path');

const CORE_ROOT = path.resolve(__dirname, '..');

const KEBAB_MD = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const FORBIDDEN_BASENAMES = new Set(['notes.md', 'temp.md', 'new-doc.md']);

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.obsidian',
  '.next',
  'dist',
  'build',
  'coverage',
]);

function posixRel(fromRoot, absPath) {
  return path.relative(fromRoot, absPath).split(path.sep).join('/');
}

function isValidDocBasename(name) {
  if (name === 'README.md') return true;
  if (FORBIDDEN_BASENAMES.has(name)) return false;
  return KEBAB_MD.test(name);
}

function collectMarkdown(absDir, out) {
  if (!fs.existsSync(absDir)) return;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      collectMarkdown(path.join(absDir, ent.name), out);
      continue;
    }
    if (!ent.isFile() || path.extname(ent.name) !== '.md') continue;
    out.push(path.join(absDir, ent.name));
  }
}

function resolveDocTrees() {
  const trees = [
    path.join(CORE_ROOT, 'docs'),
    path.join(CORE_ROOT, 'backend', 'docs'),
    path.join(CORE_ROOT, 'frontend', 'docs'),
  ];
  const platformDocs = path.join(CORE_ROOT, '..', 'docs');
  const coreDocs = path.join(CORE_ROOT, 'docs');
  if (
    fs.existsSync(platformDocs) &&
    path.resolve(platformDocs) !== path.resolve(coreDocs)
  ) {
    trees.push(platformDocs);
  }
  return trees;
}

function main() {
  const files = [];
  for (const tree of resolveDocTrees()) {
    collectMarkdown(tree, files);
  }
  const hits = [];
  for (const abs of files) {
    const name = path.basename(abs);
    if (isValidDocBasename(name)) continue;
    const fromRepo = abs.startsWith(CORE_ROOT + path.sep)
      ? posixRel(CORE_ROOT, abs)
      : posixRel(path.join(CORE_ROOT, '..'), abs);
    hits.push(fromRepo);
  }
  if (hits.length === 0) {
    return;
  }
  console.error(
    'Doc filename check failed. Markdown docs must use kebab-case (e.g. sentry-launch-checklist.md, quick-start-ru.md) or README.md. Do not use notes.md, temp.md, or new-doc.md.',
  );
  for (const rel of hits.sort()) {
    console.error(`${rel}: invalid doc filename (want kebab-case or README.md)`);
  }
  process.exit(1);
}

main();
