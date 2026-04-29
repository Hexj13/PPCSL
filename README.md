---
title: PPCSL Core
owner: platform
tags:
  - type/readme
  - scope/core
  - status/active
---

# PPCSL Core

**Platform-Portable Car Sales Logic** — universal core for building car marketplaces.

## Concept

**One Core** → **Multiple platforms** (Moldova and others)

- **Core** = business logic, components, API (universal)
- **Platform-repo** = localization (language, currency, design, cities)

---

## Documentation

All documentation lives in **[`docs/`](./docs/)**:

### Entry points

- **[docs/README.md](./docs/README.md)** — Core documentation entry point
- **[docs/guides/platform-checklist.md](./docs/guides/platform-checklist.md)** — Checklist for new platforms
- **[docs/architecture/architecture-overview.md](./docs/architecture/architecture-overview.md)** — Architecture overview

### Categories

- **[architecture/](./docs/architecture/)** — System architecture
- **[guides/](./docs/guides/)** — Developer guides
- **[platform-plans/](./docs/platform-plans/)** — Platform-specific plans
- **[features/](./docs/features/)** — Feature documentation

---

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start Docker (PostgreSQL + Redis)
docker compose up -d

# Run both frontend and backend
npm run dev
```

**Frontend:** http://localhost:3000  
**Backend:** http://localhost:4000

**Detailed docs:** [docs/guides/local-development.md](./docs/guides/local-development.md)

---

## Structure

```
PPCSL/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── scripts/stage/       # Staging/dev scripts
│   │   ├── scripts/production/  # Production-safe scripts
│   │   ├── scripts/platforms/   # Platform configs (e.g. md/)
│   │   ├── brands/              # Brands and models
│   │   └── ...
│   └── docs/         # Backend-specific docs
├── frontend/         # Next.js frontend
│   ├── ui/           # Design system
│   └── docs/         # Frontend-specific docs
├── docs/             # Main documentation
└── docker-compose.yml
```

---

## For developers

### Backend

- **[backend/docs/README.md](./backend/docs/README.md)** — Backend documentation
- **[backend/docs/SCRIPTS.md](./backend/docs/SCRIPTS.md)** — Scripts

### Frontend

- **[frontend/docs/README.md](./frontend/docs/README.md)** — Frontend documentation
- **[frontend/docs/design-system.md](./frontend/docs/design-system.md)** — Design system

### Creating platforms

- **[docs/guides/platform-guide.md](./docs/guides/platform-guide.md)** — Full guide

---

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests
cd backend && npm run test:integration

# Frontend tests
cd frontend && npm test
```

**Documentation:** [backend/docs/TESTING.md](./backend/docs/TESTING.md)

---

## Important

Before creating new platforms, read:

- [docs/architecture/scripts-architecture.md](./docs/architecture/scripts-architecture.md) — **CRITICAL**
- [docs/architecture/known-issues.md](./docs/architecture/known-issues.md)

---

**Stack:** Next.js 15, React 19, NestJS, PostgreSQL, Redis, TypeORM, TailwindCSS, Zustand
