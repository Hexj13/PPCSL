---
title: Documentation architecture
owner: platform
tags:
  - type/architecture
  - domain/docs
  - scope/core
  - status/active
---

# Documentation architecture

## Target structure (repo docs)

- **architecture/** — system overview, multi-repo, backend layers, scripts, known issues, technical; ADR in `architecture/adr/`.
- **domains/** — business-domain docs (DDD); currently reserved for gradual regrouping, while active feature docs still live in `features/`.
- **engineering/** — backend, frontend, QA, conventions, documentation standards.
- **operations/** — deploy, monitoring, runbooks, Sentry.
- **reference/** — env vars, permissions, glossary, scripts reference, analytics, audits.
- **prompts/** — prompt docs, single template.
- **_deprecated/** — deprecated docs; do not delete without review.

## Repo docs vs Obsidian vault

| Repo docs (source of truth) | Vault (knowledge / research) |
|-----------------------------|------------------------------|
| Stable system knowledge | Brainstorming, rough notes |
| Runbooks, integration specs | Product ideas, investigations |
| Domain rules, architecture overview | Hypotheses, draft decisions |
| ADR | Architecture exploration |

When vault knowledge becomes stable, convert to a structured doc and add to `architecture/`, `domains/`, or `reference/`.

## Scope

- **core/docs** — shared documentation for all platforms.
- **Platform repo docs** (e.g. kupito.club/docs) — platform-specific (Moldova setup, deploy, env); link to core for shared content.

## README-first

Each section has a README: overview + links + owner/reviewers. No long specs in READMEs.
