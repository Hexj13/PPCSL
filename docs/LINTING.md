---
title: Linting and code quality
owner: platform
tags:
  - type/reference
  - domain/engineering
  - scope/core
  - status/active
---

# Linting & Code Quality

Single reference for linting and formatting across the project (frontend and backend). Audit date: 2026-03-12.

## Philosophy

- **0 errors** — strict standard, enforced in CI. Errors break the build.
- **Warnings** — informational; they do not break the build but should be reduced over time.

---

## Current setup

| Tool                | Frontend                            | Backend                                |
| ------------------- | ----------------------------------- | -------------------------------------- |
| ESLint              | v9 (flat config)                    | v9 (flat config)                       |
| Prettier            | v3.8                                | v3.8                                   |
| Stylelint           | v17 (CSS + Tailwind)                | —                                      |
| TypeScript          | v5.7 (strict)                       | v5.3 (strict, `noImplicitAny`)         |
| Husky + lint-staged | Pre-commit hooks                    | Pre-commit hooks                       |
| Custom plugins      | `no-hardcoded-text`                 | `no-hardcoded-text`, `require-vehicle-type` |

### ESLint plugins

**Frontend:** `@next/eslint-plugin-next` (core-web-vitals), `eslint-plugin-jsx-a11y`, `eslint-plugin-testing-library` (test files), `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `no-hardcoded-text`.

**Backend:** typescript-eslint, `eslint-plugin-import`, `no-hardcoded-text`, `require-vehicle-type`.

### Key rules

| Rule                      | Frontend | Backend |
| ------------------------- | -------- | ------- |
| `no-explicit-any`         | warn     | warn    |
| `no-unused-vars`          | error    | error   |
| `no-floating-promises`    | warn     | warn    |
| `consistent-type-imports` | warn     | warn    |
| `complexity`              | warn (max 25) | —   |
| `max-lines`               | warn (600)   | —   |
| `max-lines-per-function`  | warn (400)   | —   |

---

## Running the linter

### Frontend

```bash
cd core/frontend
npm run lint          # ESLint + translation sync
npm run lint:fix      # Auto-fix
npm run lint:styles   # Stylelint check
npm run lint:styles:fix
npm run lint:translations  # Translation key sync
npm run format        # Prettier
npm run format:check
```

### Backend

```bash
cd core/backend
npm run lint:check    # Check
npm run lint          # Auto-fix
npm run format        # Prettier
npm run format:check
```

### Release check (root)

```bash
npm run release-check
```

Runs `prepare:build`, then frontend (`lint`, `lint:styles`, `format:check`, `test`, `build`), then backend (`lint:check`, `format:check`, `test`, `test:integration`, `build`).

`release-check` already unsets `devdir` internally, so no extra wrapper is needed.

### Pre-commit (root)

Husky runs lint-staged on commit. Staged files are linted/formatted by pattern:

| Pattern                          | Actions                |
| --------------------------------- | ---------------------- |
| `core/frontend/**/*.{ts,tsx}`     | ESLint fix + Prettier  |
| `core/frontend/**/*.css`          | Stylelint fix          |
| `core/backend/src/**/*.ts`        | ESLint fix + Prettier  |
| `locales/**/*.json`, `config/**`, `theme/**` | Prettier |

Config: `.lintstagedrc.mjs`, `.husky/pre-commit`.

---

## Config files

| Purpose              | Path |
| -------------------- | ---- |
| Husky pre-commit     | `.husky/pre-commit` |
| lint-staged          | `.lintstagedrc.mjs` |
| EditorConfig         | `core/.editorconfig` |
| ESLint (frontend)    | `core/frontend/config/eslint.config.mjs` |
| ESLint (backend)     | `core/backend/eslint.config.mjs` |
| Prettier (frontend)  | `core/frontend/.prettierrc` |
| Prettier (backend)   | `core/backend/.prettierrc` |
| Stylelint            | `core/frontend/config/stylelint.config.js` |
| no-hardcoded-text (FE) | `core/frontend/config/eslint/eslint-plugin-no-hardcoded-text.mjs` |
| no-hardcoded-text (BE) | `core/backend/config/eslint/eslint-plugin-no-hardcoded-text.cjs` |
| require-vehicle-type | `core/backend/config/eslint/eslint-plugin-require-vehicle-type.cjs` |

---

## Rule details

### no-hardcoded-text

**Goal:** No hardcoded user-facing strings in code.

**Frontend examples:** JSX text, attributes (e.g. `placeholder`), and calls like `setError(...)`, `toast.success(...)`, `toast.error(...)` should go through translations.

**Correct usage:**

```tsx
// Wrong
<div>Welcome</div>
setError('Invalid code')
toast.success('Sent')

// Correct
<div>{t('welcome.message')}</div>
setError(t('errors.invalidCode'))
toast.success(t('sms.codeSent'))
```

**Ignored automatically:** Empty strings, numbers/URLs, separators (`:`, `|`, `•`), single letters, emoji, and other allow-listed patterns from the ESLint config.

### import/order

**Goal:** Consistent import order. Groups: builtin → external → internal → parent → sibling → index; blank line between groups; alphabetical within group.

### TypeScript

- `no-unused-vars`: error (args/vars starting with `_` ignored).
- `no-explicit-any`, `no-floating-promises`, `consistent-type-imports`: warn.

### React (frontend)

- `react-hooks/rules-of-hooks`: error.
- `react-hooks/exhaustive-deps`: warn.
- `react/react-in-jsx-scope`: off.

### Complexity and size (frontend)

- `max-lines`: warn if file > 600 (blank lines/comments excluded).
- `max-lines-per-function`: warn if function > 400 lines.
- `complexity`: warn if cyclomatic complexity > 25.

**Guidance:** Prefer splitting large files and functions; extract helpers to lower complexity.

---

## Translations (frontend)

### Adding keys

1. Use the key in code: `t('profile.changePhone.title')`.
2. Add the same key in root locale source files: `locales/ro.json`, `locales/ru.json`, and `core/frontend/lib/locales/en.json` if English fallback is used for that key.
3. Run `npm run lint:translations` (from frontend) to verify sync.

### Sync check

`npm run lint:translations` ensures keys exist in all languages and structure matches. Fix by adding missing keys or removing unused ones.

---

## Common issues and fixes

| Issue | Fix |
| ----- | --- |
| Hardcoded text in `setError()` / `toast.*()` | Use `t('key')` and add the key to all locale files. |
| Missing key in translations | Add the key in root locale source files, then run `npm run lint:translations`. |
| Translation sync errors | Add or remove keys so all locale files match. |
| Import order | Run `npm run lint:fix` (or `sort-imports` if configured). |
| Backend lint command unexpectedly changes files | `npm run lint` is fix mode; use `npm run lint:check` for read-only verification. |
| Frontend CSS violations | Run `npm run lint:styles` or `npm run lint:styles:fix`. |

`no-hardcoded-text` cannot be auto-fixed; add translation keys manually.

---

## Current status (baseline 2026-03-12)

| Project  | Errors | Warnings |
| -------- | ------ | -------- |
| Frontend | 0      | ~200     |
| Backend  | 0      | 0        |

**Frontend warnings (main categories):** testing-library (no-node-access, no-container, no-unnecessary-act), complexity, max-lines, max-lines-per-function. These are improvement targets: prefer `screen` queries in tests, split large files/functions, and reduce complexity over time.

---

## Implementation summary (audit)

- Pre-commit: Husky v9 + lint-staged.
- Next.js: core-web-vitals config; fixes for `<Link>`, `lang`, iframe `title`.
- Single `no-unused-vars` (TypeScript); Prettier `trailingComma: "all"`; `.editorconfig` in core.
- Added/changed: `no-floating-promises`, `consistent-type-imports`, jsx-a11y, testing-library, complexity/size limits (warn).
- Backend: `noImplicitAny: true`; Express types and `AuthenticatedRequest` for `req.user`.

---

## Best practices

1. Use `t()` for all user-facing text; add keys to every locale.
2. Run `npm run lint` (and `lint:translations` for frontend) before committing.
3. Use meaningful translation keys and a clear hierarchy (e.g. `profile.changePhone.*`).
4. Address new errors immediately; treat warnings as a backlog to reduce over time.

---

## References

- [ESLint](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React Hooks ESLint](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)
