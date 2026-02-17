# NPM audit and deprecation warnings

## Summary

- **Frontend:** All production-relevant vulnerabilities fixed via `npm audit fix`. Zero vulnerabilities reported.
- **Backend:** Safe fixes applied; overrides added for transitive deps (axios, tar, js-yaml, lodash). Remaining 7 issues are in **dev/build-only** tooling (`@nestjs/cli`).

## Deprecation warnings (npm install / npm ci)

These come from **transitive dependencies**, not from our direct `package.json`. They do not break the build.

| Package        | Used by                          | Note |
|----------------|-----------------------------------|------|
| `inflight`     | Jest (glob@7), bcrypt (rimraf)    | Deprecated; consider upgrading when Jest/bcrypt update. |
| `glob@7`       | Jest, bcrypt→node-pre-gyp→rimraf | Pre-v9 no longer supported; Jest still uses it. |
| `domexception` | jsdom (jest-environment-jsdom)   | Polyfill; modern envs have native DOMException. |
| `abab`         | jsdom                            | Polyfill for atob/btoa; native available. |

No action required for production; they will disappear as upstream deps (Jest, jsdom, etc.) update.

## Frontend vulnerabilities (resolved)

All 5 issues were fixed with `npm audit fix`:

- **axios** (high) – DoS via `__proto__` in mergeConfig
- **diff** (low) – DoS in parsePatch/applyPatch
- **js-yaml** (moderate) – prototype pollution in merge
- **next** (critical) – RCE, Server Actions exposure, DoS, etc.
- **storybook** (high) – env vars exposure in manager bundle

Run `npm audit` in `core/frontend` after any dependency change.

## Backend vulnerabilities

### Fixed (via audit fix + overrides)

- **axios** – overridden to ^1.13.5 (was in jest-openapi)
- **tar** – overridden to ^7.5.7 (was in bcrypt → node-pre-gyp)
- **js-yaml** – overridden to ^4.1.1 (was in @nestjs/swagger)
- **lodash** – overridden to ^4.17.23 (was in @nestjs/config, @nestjs/swagger)
- Plus: diff, jws, nodemailer, qs/body-parser/express, validator, fast-xml-parser (AWS SDK), etc. fixed by `npm audit fix`

### Remaining (7) – dev/build only

All remaining issues are inside **@nestjs/cli** (used for `nest build` and dev). They do **not** ship to production:

| Package  | Severity | Note |
|----------|----------|------|
| glob     | high     | CLI command injection; only relevant if `nest` runs untrusted input. |
| tmp      | high     | Symlink in temp dir; dev/build context only. |
| webpack  | (SSRF)   | buildHttp; only affects build-time, not runtime. |

To remove these without breaking the stack, we need to upgrade to **@nestjs/cli@11** (and possibly NestJS 11). That is a planned, separate task.

**Override block** in `core/backend/package.json`:

```json
"overrides": {
  "axios": "^1.13.5",
  "tar": "^7.5.7",
  "js-yaml": "^4.1.1",
  "lodash": "^4.17.23"
}
```

Do not remove these overrides without checking `npm audit` and release notes for the affected packages.

## npm warn "Unknown env config devdir"

This comes from an environment variable `devdir` that npm no longer supports. It does not affect install or build. To silence it, remove `devdir` from your shell profile or CI environment.

## Commands

```bash
# Frontend
cd core/frontend && npm audit

# Backend
cd core/backend && npm audit

# After changing dependencies, re-check both and run tests
npm run release-check
```
