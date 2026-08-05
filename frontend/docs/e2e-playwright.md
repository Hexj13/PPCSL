---
title: Playwright E2E
owner: platform
tags:
  - type/guide
  - domain/testing
  - scope/core
  - status/active
---

# Playwright E2E

Canonical E2E standard is documented in:

- [`core/docs/guides/e2e-playwright-standards.md`](../../docs/guides/e2e-playwright-standards.md)
- [`core/docs/architecture/e2e-test-architecture.md`](../../docs/architecture/e2e-test-architecture.md)

The suite is **multi-platform** (Moldova `md` + Albania `al`): use `e2e/platform/contract.ts` (`getE2ePlatform`, `buildUniquePlatformPhone`) instead of country literals. Verify e2e changes on both platform repos after `prepare:build`.

Use this frontend page as an entry point, and keep the detailed policy in the core docs guide above.

Reporting policy:

- Use Allure for E2E run reports (`allure-results`, `allure-report`).
