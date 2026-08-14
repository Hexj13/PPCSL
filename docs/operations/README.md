---
title: Operations
owner: platform
tags:
  - type/readme
  - domain/ops
  - scope/core
  - status/active
---

# Operations

Deploy, monitoring, runbooks.

## Contents

- [../guides/DEPLOYMENT.md](../guides/DEPLOYMENT.md) — deployment
- [smtp-email-setup.md](./smtp-email-setup.md) — transactional email (SMTP): local, Render, Google Workspace ([RU](./smtp-email-setup-ru.md))
- [../guides/SENTRY.md](../guides/SENTRY.md) — Sentry setup and monitoring
- [sentry-launch-checklist.md](./sentry-launch-checklist.md) — Sentry launch readiness
- [user-action-logging.md](./user-action-logging.md) — structured user-action logs (INFO success, WARN `errors.*` failures on allowlisted routes)
- [postgres-query-baseline.md](./postgres-query-baseline.md) — slow queries, pool, EXPLAIN
- [postgres-backup-restore.md](./postgres-backup-restore.md) — Render PITR, logical exports, `pg_dump` restore drill

Platform-specific: see platform repo `docs/deployment/`, `docs/sentry/`.

## Expected reviewers

DevOps, platform owner.
