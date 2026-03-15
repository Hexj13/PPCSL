---
title: Doc templates
owner: platform
tags:
  - type/reference
  - domain/docs
  - scope/core
  - status/active
---

# Documentation templates

Use these when creating new docs. All docs: kebab-case filename, frontmatter with `title`, `owner`, `tags` (at least type, scope, status).

| Type | Template | Section |
|------|----------|---------|
| Section README | [section-readme.md](./section-readme.md) | Any section |
| ADR | [adr.md](./adr.md) | architecture/adr/ |
| Runbook | [runbook.md](./runbook.md) | operations/ |
| Reference | [reference.md](./reference.md) | reference/ |
| Feature/domain | [feature.md](./feature.md) | domains/ or features/ |
| Prompt | [prompt.md](./prompt.md) | prompts/ |

Root README and domain README: same structure as section README (overview, links, owner, reviewers).
