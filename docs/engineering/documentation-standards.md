---
title: Documentation standards
owner: platform
tags:
  - type/reference
  - domain/docs
  - scope/core
  - status/active
---

# Documentation standards

## README-first

- Each section has a README: short overview, links to docs, owner and expected reviewers.
- READMEs are for navigation and context, not long specs or implementation dumps.

## Format

- **Frontmatter:** `title`, `owner`, `tags` (see tag taxonomy). Optional: `status`, `last_updated`.
- **Headings:** One H1 per document (title); H2 for main sections; H3 for subsections. No heading level skipping.
- **Style:** Short sentences, bullet lists where useful. No marketing speak. Facts only. Shared core docs may name platforms as *examples* of overlay repos; application code in `core/frontend` and `core/backend` must not (see [linting.md](./linting.md) platform-neutral core).
- **Code:** Use fenced code blocks with language. Paths and commands in backticks in prose.
- **Links:** Prefer relative links to other docs. Link to core paths from platform repo.

## Language

- **Default:** All documentation is in English (root and core: `docs/`, `core/docs/`, `core/backend/docs/`, `core/frontend/docs/`, READMEs).
- **Intentional Russian:** Only docs explicitly for Russian-speaking audience use Russian. Such docs must have the filename suffix `-ru` (e.g. `quick-start-ru.md`). Do not translate them.
- **No mixed language:** A document is either fully English or, if intentional, fully Russian with `-ru` in the name. Avoid mixing languages in one file. If a touched file still contains mixed-language content, normalize it as part of the same change.

## Naming

- **Files:** kebab-case (e.g. `popular-brands-sync.md`, `sentry-launch-checklist.md`). No `notes.md`, `temp.md`, `new-doc.md`. Use `-ru` suffix only for intentional Russian-language docs.
- **Tags:** Use taxonomy: `type/*`, `domain/*`, `scope/core` or `scope/platform`, `status/active` or `status/deprecated`.

## Tags (Obsidian-compatible)

Minimum per doc: one `type/*`, one `scope/*`, one `status/*`. Optional: `domain/*`, `ops/*`.

- **type:** type/readme, type/guide, type/architecture, type/runbook, type/reference, type/adr, type/prompt, type/audit
- **domain:** domain/listings, domain/search, domain/brands-models, domain/docs, domain/ops
- **scope:** scope/core, scope/platform
- **status:** status/active, status/deprecated, status/draft

## Update vs create

- Prefer **updating** an existing doc over creating a new one. Search existing docs first.
- Create new only when the topic has no suitable doc or belongs in a different section (see decision tree).

## Section choice (decision tree)

| Content | Section |
|--------|---------|
| System/technical architecture, ADR | architecture/ |
| Business domain, feature, flows | domains/ (or features/ for now) |
| Backend/frontend/QA, conventions, linting | engineering/ |
| Deploy, monitoring, runbooks, Sentry | operations/ |
| Env vars, scripts ref, glossary, analytics | reference/ |
| Prompt docs | prompts/ |

## Anti-duplication

- One source of truth per topic. If info exists elsewhere, add a short summary and link; do not copy long blocks.
- Deprecated or superseded docs: move to `_deprecated/` with a note; do not delete silently.

## Ownership

- Section READMEs list **Owner** and **Expected reviewers**. Keep them up to date when responsibility changes.
