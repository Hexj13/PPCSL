---
title: Structured logging and Sentry payloads
owner: platform
tags:
  - type/guide
  - domain/ops
  - scope/core
  - status/active
---

# Structured logging and Sentry payloads

## Scope

This guide defines how we attach **structured context** to Sentry (errors and logs) for PPCSL and platform deployments. It complements **[SENTRY.md](./SENTRY.md)** (SDK setup).

## Principles

- Prefer **milestone** events (operation outcome, failure with context), not per-line traces.
- **Debug** is for local development only; production Sentry should receive mostly `info` / `warn` / `error` for business-relevant events.
- Reuse the **Sentry trace**; do not duplicate the same story across many thin log lines when one structured payload is enough.

## Recommended fields

Use stable keys so events are searchable in Sentry:

| Key | When |
| --- | --- |
| `operation` | Named business operation (e.g. `publishListing`, `refreshSession`) |
| `listingId` | Listing-related flows |
| `userId` | Authenticated actor (id only unless product policy says otherwise) |
| `requestId` | Correlates browser → API (see below) |
| `statusCode` / `httpStatus` | HTTP layer |
| `errorCode` | Application `code` from API when present |

## Forbidden or restricted

Do not send to Sentry `extra` / unstructured logs:

- Passwords, secrets, raw JWTs, refresh/access tokens, API keys
- Cookies and session identifiers
- Full payment or card data
- Entire raw request bodies when a smaller allowlisted subset is enough

Use `sanitizeForSentryExtra` on the backend (`core/backend/src/common/utils/sentry-payload.utils.ts`) and the frontend mirror (`core/frontend/lib/sentry-sanitize.ts`) before attaching dynamic objects.

**Event-level scrubbing:** Both SDKs register `beforeSend` handlers that run `sanitizeSentryEvent` / shared logic to redact phone, email, tokens, and verification codes from `extra`, `request` (URL query, headers, body), `user` (keeps `id` only), `breadcrumbs`, and `contexts`:

- Backend: `core/backend/src/common/utils/sentry-event-sanitize.utils.ts`, wired in `core/backend/src/common/sentry.config.ts`
- Frontend: `core/frontend/lib/sentry-event-sanitize.ts`, wired in `core/frontend/lib/sentry-before-send.ts`

Request URLs keep redacted query values as `[REDACTED]` (URL-encoded in the stored string).

## Request correlation

- **Browser:** Axios sets `X-Request-Id` per request (`core/frontend/lib/api/api-client.ts`) and passes the same value into Sentry `tags`/`extra` when reporting API failures.
- **API:** `requestIdMiddleware` (`core/backend/src/common/middleware/request-id.middleware.ts`) accepts or generates `X-Request-Id`, echoes it on the response, and exposes `request.requestId` for filters and `SentryInterceptor`.

Search in Sentry by `requestId:<uuid>` across frontend and backend projects when both sides report the same id.

## Privacy and legal

- Review **[config/legal.ts](../../../config/legal.ts)** when **new categories** of personal data are sent to Sentry or retention/sharing changes.
- **Minimizing** payloads (sanitization, dropping email from `extra`) does not by itself require legal text changes; **expanding** what is collected does.

## LogTape decision (go / no-go)

**Status: deferred.** The codebase uses native `@sentry/nextjs` / `@sentry/node` (`captureException`, `tags`, `extra`). Sentry `enableLogs` is **off**. **LogTape** (`@logtape/logtape`, `@logtape/sentry`) is **not** integrated.

Revisit only if product engineering needs unified categories + `withContext` in JS in a way that native Sentry APIs cannot satisfy after this baseline.

If LogTape is added later:

1. Initialize **Sentry before** LogTape `configure()` with `getSentrySink()`.
2. Avoid **duplicate** ingestion: choose either LogTape’s Sentry sink **or** `consoleLoggingIntegration` for the same levels in production, not both.
3. Do not use `AsyncLocalStorage` in Next **Edge** config; keep Edge on Sentry-only.

## Optional React logger context

A `LoggerProvider` that injects user into every client log is **optional** and was not added. Prefer Sentry user scope from auth unless a feature explicitly needs LogTape-style child loggers.

## Rollout checklist

After changing logging behavior:

1. No duplicate log lines for the same failure in Sentry.
2. Events remain searchable by `requestId`, `userId`, or `listingId` where applicable.
3. No unexpected growth in Sentry volume or quota usage.
4. `npm run release-check` passes.

## First integration points

- Frontend: `core/frontend/lib/api/api-client.ts`
- Backend: `core/backend/src/common/filters/http-exception.filter.ts`, `core/backend/src/common/interceptors/sentry.interceptor.ts`
