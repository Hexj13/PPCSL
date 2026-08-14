---
title: Sentry launch checklist
owner: platform
tags:
  - type/runbook
  - domain/ops
  - scope/core
  - status/active
---

# Sentry launch checklist

Pre-launch verification for Sentry monitoring. Setup: [SENTRY.md](../guides/SENTRY.md).

## What's already configured

- **Errors** — JavaScript errors, unhandled rejections, API errors (>= 500)
- **Performance tracing** — 10% client, 100% server
- **Session replay** — 100% error sessions, 10% all sessions
- **Structured logs** — enabled
- **Event sanitization** — `beforeSend` redacts phone, email, tokens, and SMS codes in `request` / `user` / breadcrumbs (see [logging.md](../guides/logging.md))
- **Metrics** — enabled
- **Cron monitors:** auto-close-old-listings, ip-block-cleanup, refresh-token-cleanup, parser-log-retention, listing-views-retention, admin-audit-log-retention
- **Business metrics:** users.registered, listings.created, listings.searches

## Before launch

1. **Environment variables** — set in production (frontend: NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN; backend: SENTRY_DSN, NODE_ENV=production).
2. **Monitors** — create in Sentry (Alerts → Crons) for cron jobs or let them be created on first run.
3. **Alerts** — configure notifications for critical issues (Issues, level=error, cron slugs).
4. **Post-deploy** — verify Issues, Performance, Metrics, Crons in Sentry.

## After launch

Monitor: error rate (< 1%), API latency (< 500ms p95), Web Vitals, business metrics, cron execution. Adjust sample rates for high traffic; see [SENTRY.md](../guides/SENTRY.md).

## Final checklist

- [ ] Env vars set in production
- [ ] Sentry dashboard accessible
- [ ] Test events arriving
- [ ] Cron monitors created
- [ ] Alerts configured
- [ ] Team knows where to find metrics and errors
