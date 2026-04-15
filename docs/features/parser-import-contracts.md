---
title: Parser import contracts
owner: platform
tags:
  - type/feature
  - domain/parsing
  - scope/core
  - status/active
---

# Parser import contracts

## Purpose

This document defines the shared data and logging contracts used by parser CLIs under `core/backend/src/scripts/tools/`.

Parsers may differ in source-specific extraction logic, but they must follow the same import contract from PLP discovery to PDP import reports.

## Shared TypeScript contracts

Shared contracts live in `core/backend/src/scripts/tools/partner-import-shared/`.

### PLP item

`ParsedPlpItem` is the minimal discovery unit:

- `sourceListingId`
- `url`
- `canonicalUrl`
- optional descriptive fields (`title`, `brand`, `model`, `year`, `price`, `currency`)

### PDP item

`ParsedPdpData` is the normalized listing payload candidate:

- source status and identifiers (`sourceStatus`, `sourceStatusReason`, `sourcePostId`)
- listing fields (title, price, currency, description)
- media and equipment (`images`, `equipmentOptions`, `equipmentKeys`)
- technical details and raw source values (`fuelRaw`, `gearboxRaw`, `driveTypeRaw`, `bodyRaw`, `colorRaw`)
- warnings (`warnings`) with `UNMAPPED_*` conventions

### Registry item

`BaseRegistryItem` is the shared persistence shape for source items:

- core identity and state (`source`, `sourceListingId`, `url`, `canonicalUrl`, `state`)
- parsed and import metadata (`parsedData`, `kupitoListingId`, `ownerUserId`, `createdStatus`)
- processing diagnostics (`error`, `warnings`, `retryCount`, image counters)
- lifecycle fields (`sourceStatus`, `missingSince`, `missingCount`, `closedAt`, `closeReason`, `closeOutcome`)

Parser-specific registry types extend this base.

### PLP snapshot

`PlpSnapshotData<TItem>` is the shared JSON snapshot format:

- `items: Record<string, TItem>`
- `meta` with:
  - `lastUpdatedAt`
  - `totalItems`
  - `activeItemsCount`
  - `missingCandidatesCount`
  - `closedItemsCount`
- optional `scope` for parser-specific context (`mode`, `key`)

### Report

`ImportReport` is the shared run report:

- run metadata (`startedAt`, `completedAt`, `elapsedMs`, `env`)
- execution flags (`flags`)
- summary counters (`summary`)
- normalization diagnostics (`unmappedValues`)
- terminal issue lists (`failedItems`, `manualReviewItems`)

## Runtime state contract

`ImportState` values are shared across parsers:

- `discovered`
- `pdp_parsed`
- `created`
- `updated`
- `closed`
- `failed`
- `skipped`
- `manual_review`

`JsonRegistryStore<TItem>` provides common atomic persistence for registry files.

## Lifecycle contract

`partner-import-shared/registry-lifecycle.ts` provides reusable lifecycle helpers:

- source status normalization
- active snapshot building
- close-candidate marking after full PLP scan
- import candidate selection order
- run-report item selection by update window
- closed-source PDP HTTP reason normalization

## CLI logging markers

CLI stdout markers are standardized in `partner-import-shared/cli-markers.ts`:

- `[DONE]` for scan totals
- `[REPORT]` for report output with `file=...`

The backend orchestrator relies on these stable markers to extract counters and report file path.

## Compatibility rule

When introducing parser-specific fields:

1. keep shared contract fields intact
2. extend parser-specific types instead of changing shared semantics
3. keep snapshot `items` as object map keyed by `sourceListingId`
4. keep report shape compatible with `ImportReport`
