---
title: Backend layers
owner: platform
tags:
  - type/architecture
  - domain/architecture
  - scope/core
  - status/active
---

# Backend Layered Architecture

The backend (`core/backend/src/`) follows a layered architecture with clear separation of concerns. Dependencies flow downward: Presentation → Application → Domain; Infrastructure implements ports defined in Application/Domain.

## Layers

```
Presentation (Controllers, DTO)
      ↓
Application (Use Cases, Ports)
      ↓
Domain (Entities, Value Objects, Domain Services)
      ↑
Infrastructure (TypeORM repos, Redis cache, SMS, Email, S3)
```

- **Presentation:** HTTP handling only. Controllers map requests to use cases and return responses. No business logic.
- **Application:** Use cases orchestrate workflows; ports define interfaces for persistence and external services.
- **Domain:** Business rules, entity behavior, value objects, and domain services. No framework dependencies.
- **Infrastructure:** Concrete implementations of repositories, caches, and external APIs.

## Module structure (example: Listings)

Fully refactored modules (Listings, Auth) use this layout:

```
listings/
├── presentation/
│   ├── listings.controller.ts
│   └── dto/
├── application/
│   ├── use-cases/          # one file per use case
│   ├── ports/              # IListingRepository, IListingCache, etc.
│   └── listings.service.ts # facade delegating to use cases
├── domain/
│   ├── entities/           # Listing, Vehicle (with domain methods)
│   ├── value-objects/       # e.g. Price
│   ├── services/           # PromotionRulesService, ListingTitleService, etc.
│   └── utils/
├── infrastructure/
│   ├── persistence/        # TypeORM entities and repository implementations
│   └── cache/              # Redis cache implementations
└── listings.module.ts
```

## Conventions

- **Controllers:** No business logic; call service or use case and return result.
- **Use cases:** Single responsibility; inject ports and domain services, not concrete infrastructure.
- **Domain entities:** Encapsulate invariants and state transitions (e.g. `Listing.publish()`, `User.getDisplayName()`).
- **Configuration:** Injected via constructor (e.g. `PromotionRulesConfig`) rather than `process.env` in domain.
- **Testing:** Entity tests use real class instances (`Object.assign(new Entity(), defaults, overrides)`). Domain and use cases are unit-tested with mocked ports.

## Bounded contexts

| Context      | Responsibility                          | Main aggregate       |
| ------------ | --------------------------------------- | -------------------- |
| Listings     | Ads, vehicles, search, promotion, views | Listing → Vehicle    |
| Auth         | Registration, login, JWT, verification  | — (coordinates User) |
| Users        | Profile, limits, board slug             | User                 |
| Catalog      | Brands and models (reference data)      | Brand → VehicleModel |
| Favorites    | Saved listings                          | Favorite             |
| SavedFilters | Saved search filters                    | SavedFilter          |

## Related documentation

- [technical.md](./technical.md) — project structure, API, database, testing
- [scripts-architecture.md](./scripts-architecture.md) — platform scripts and configs
