# Frontend config

Tool and environment configs live here (aligned with backend `config/` layout).

- **eslint/** – ESLint plugin and `eslint.config.mjs` (used via `npm run lint -c config/eslint.config.mjs`)
- **jest/** – Jest setup and type shims (`jest.setup.js`, `jest.d.ts`)
- **sentry/** – Sentry server and edge configs (loaded from root `instrumentation.ts`)
- **stylelint.config.js** – Stylelint rules
- **vitest.config.ts** – Vitest config for Storybook addon-vitest (root `vitest.config.ts` re-exports this)
- **vitest.shims.d.ts** – Vitest browser types
- **proxy.ts** – Middleware-style redirect/cache logic (import from `@/config/proxy` if used in `middleware.ts`)

Next.js requires `next.config.js`, `tailwind.config.js`, and `postcss.config.js` in the project root, so those stay in the frontend root.
