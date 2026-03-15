---
title: Obsidian usage
owner: platform
tags:
  - type/guide
  - domain/docs
  - scope/core
  - status/active
---

# Obsidian usage

## Why the project uses Obsidian

- Knowledge graph and backlinks for exploration
- Research, product thinking, architecture exploration
- Idea incubation and decision preparation
- Rough notes that can be promoted to stable docs

## What lives in repo docs (source of truth)

- Stable system knowledge
- Runbooks, integration specs, domain rules
- Architecture overview and ADR
- Reference (env vars, scripts, glossary)

## What can live in Obsidian vault only

- Brainstorming, rough notes
- Product ideas, investigations, performance research
- Competitor analysis, architecture exploration
- Hypotheses, draft decisions

## Syncing vault → repo

When vault knowledge becomes stable and reusable:

1. Turn the note into a structured doc (frontmatter, headings, tags).
2. Place it in the right section: `architecture/`, `domains/`, `engineering/`, `operations/`, `reference/`, or `prompts/`.
3. Add a link from the section README if needed.
4. Optionally keep the vault note as a stub that links to the repo doc.

## Backlinks and MOC

- Use wikilinks `[[doc-name]]` so Obsidian can build backlinks.
- Use a Map of Content (MOC) note in the vault to group related notes; repo docs stay in folder-based navigation.

## Tags

- Use the same tag taxonomy as repo docs (type, domain, scope, status) so vault notes can be filtered and aligned with repo structure when promoted.

## Avoiding chaos

- Do not turn repo docs into a dense graph of cross-links for the sake of it. Repo docs = readable in a browser or editor without Obsidian.
- Do not fragment knowledge: prefer one doc per topic; link from READMEs.

## When to create a new doc vs update

- New **topic** with no existing doc → create, place by decision tree, add to section README.
- **Existing topic** → update the existing doc; do not create a duplicate.
