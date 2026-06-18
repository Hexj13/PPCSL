# CipAuto Active Listing Reconciliation Runbook

Use this runbook after deploying the CipAuto parser changes that identify listings by `sourcePostId`.

Target user for the Moldova platform:

```bash
USER_ID=976800e3-7789-4aec-ac03-94ee45b25f28
```

## 1. Deploy Backend

Merge and deploy the core backend build that contains:

- PLP `sourcePostId` extraction and registry matching.
- Import reopen handling.
- `--max-close` / `--force-close` protection.
- Stable `partner_listing_external_key` backfill support.
- `cipauto:reconcile` command.

## 2. Refresh PLP Registry

Run a fresh full scan on the production backend shell:

```bash
cd core/backend
npm run cipauto:scan -- --env prod --pages 80
```

Use the page count that covers the full catalog. The scan must start at page 1 and reach the detected last page so missing-candidate metadata is reliable.

## 3. Dry-Run Reconciliation

Run the reconciliation in dry-run mode first:

```bash
cd core/backend
npm run cipauto:reconcile -- --env prod --userId "$USER_ID"
```

Existing listings are matched to live `postId`s by numeric `partner_listing_external_key`, or by their stored slug / canonical URL resolved against the fresh PLP snapshot. A complete scan in step 2 is therefore required for reliable matching.

Review the report:

- The command writes `cipauto-reconcile-*.json` to the configured reports directory; keep both dry-run and apply reports.
- `PLP live postIds` should be close to the current listing count on cipauto.md.
- `Reopen live closed` should explain the gap between live source cars and active Kupito cars.
- `Close duplicates` should contain only duplicate Kupito listings for the same `postId`.
- `Stale active left as-is` is intentionally conservative and is not closed by this script.
- `Active now/projected` must not exceed the user's listing limit. The CipAuto user should be `Business` with a 1000 active-listing limit.

If the dry-run does not look safe, stop and inspect the listed IDs before applying.

## 4. Apply Reconciliation

Apply only after the dry-run is reviewed:

```bash
cd core/backend
npm run cipauto:reconcile -- --env prod --userId "$USER_ID" --apply
```

The apply step:

- Reopens one keeper listing for each live `postId` group where all Kupito listings are closed.
- Closes active duplicate listings for live `postId` groups.
- Backfills `partner_source_code`, `partner_listing_external_key`, and canonical URL on keeper listings.
- Invalidates `listings:search:*` Redis keys when Redis is reachable.

## 5. Import Remaining Listings

Run import with a conservative close guard:

```bash
cd core/backend
npm run cipauto:import -- --env prod --userId "$USER_ID" --status active --max-close 40
```

If source closures are intentionally needed in the same run, add `--remove-closed`. If the guard blocks a trusted closure run, inspect the count and re-run with an explicit higher `--max-close` or `--force-close`.

## 6. Verify

After reconciliation and import:

```bash
cd core/backend
npm run clear-cache:listings
```

Verify:

- Active Kupito listings for the user are close to the live CipAuto PLP count.
- New imports use numeric `partner_listing_external_key` values.
- Subsequent scans no longer create duplicate registry entries for rotated slug URLs with the same `sourcePostId`.
