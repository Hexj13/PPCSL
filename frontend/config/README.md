---
title: Frontend config
owner: platform
tags:
  - type/readme
  - domain/engineering
  - scope/core
  - status/active
---

# Frontend config

Tool and environment configs live here (aligned with backend `config/` layout).

- **eslint/** – ESLint plugin; main config in `config/eslint.config.mjs`, re-exported from root `eslint.config.mjs` for ESLint 9 auto-discovery
- **jest/** – Jest setup and type shims (`jest.setup.js`, `jest.d.ts`)
- **sentry/** – Sentry server and edge configs (loaded from root `instrumentation.ts`)
- **stylelint.config.js** – Stylelint rules
- **vitest.config.ts** – Vitest config for Storybook addon-vitest (root `vitest.config.ts` re-exports this)
- **vitest.shims.d.ts** – Vitest browser types
- **proxy.ts** (under `config/`) – optional redirect/cache helpers; the Next.js network boundary file is root `proxy.ts`

Next.js requires `next.config.js`, `tailwind.config.js`, and `postcss.config.js` in the project root, so those stay in the frontend root.
