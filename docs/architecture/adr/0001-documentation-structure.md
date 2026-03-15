---
title: ADR 0001 — Documentation structure
date: "2026-03"
status: accepted
tags:
  - type/adr
  - domain/docs
  - scope/core
  - status/active
---

# ADR 0001: Documentation structure

## Context

Documentation was split across root `docs/`, `core/docs/` (guides, features, architecture, scripts, analytics, audits) with inconsistent naming (UPPER_SNAKE, mixed languages), no single TODO, and no clear Obsidian boundary.

## Decision

- Adopt README-first navigation and domain-driven grouping: **architecture**, **domains**, **engineering**, **operations**, **reference**, **prompts**; **ADR** under architecture.
- Use **kebab-case** for doc names; **tags** in frontmatter for Obsidian (type, domain, scope, status).
- **Single source of truth** in core for shared content; platform repo only platform-specific docs.
- **Single master TODO** for documentation backlog; deprecate scattered TODO sections.
- **Deprecated** docs go to `_deprecated/` with reason, not deleted silently.
- **Repo docs** = stable system knowledge; **Obsidian vault** = research, ideas, drafts; promote to repo when stable.

## Consequences

- Existing docs are migrated and renamed over phases; links updated.
- New docs use templates with frontmatter and tags; Cursor rules/commands enforce section and template.
