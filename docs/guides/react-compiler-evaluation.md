# React Compiler evaluation

## Current setup

`core/frontend/next.config.js` enables the compiler only when `REACT_COMPILER=true` at build time. Default CI and local builds keep it off until metrics justify turning it on.

## How to evaluate

1. Create a branch and set `REACT_COMPILER=true` for production builds.
2. Run `npm run analyze` and compare First Load JS for heavy routes (`/`, `/listings`, `/listings/[id]`, `/my-listings`).
3. Run `npm run test` and `npm run test:e2e` — focus on forms, modals, and search filters.
4. Deploy to staging and watch Sentry for new render loops or stale UI.

## Rollout criteria

- No new unit or E2E failures attributable to memoization
- Bundle size change within agreed budget (document delta in PR)
- No increase in client error rate on listing create/edit and search

## Rollback

Unset `REACT_COMPILER` and redeploy; no data migration required.
