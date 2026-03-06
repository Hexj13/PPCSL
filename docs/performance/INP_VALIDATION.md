# INP Post-Change Validation

After deploying INP optimizations, use this checklist to validate results.

## Acceptance Criteria

- **Trace KPI:** No click/submit handler windows longer than 16ms on target interactions (filter submit, quick filter, sort change, listing card click).
- **Trace KPI:** Fewer long tasks in the 0–250ms window after filter submit and card click.
- **Trace KPI:** Third-party (GTM/Tawk) activity starts after first interaction or idle, not during initial critical path.
- **Field (GSC):** INP p75 &lt; 200ms for mobile (PHONE) for the affected URL group (e.g. `/`, `/?brand=...&model=...`).

## Validation Steps

1. **Local profiling (Chrome DevTools)**
   - Open the site on a mobile viewport (e.g. 414×896) or use device emulation.
   - Record a Performance trace (Performance tab → record) while:
     - Applying a filter and clicking Search.
     - Applying a quick filter (e.g. body type).
     - Changing sort in the dropdown.
     - Clicking a listing card to open the detail page.
     - Scrolling in the filters area (scroll-to-filters button zone).
   - In the trace, check:
     - `EventDispatch` for `click` / `submit`: duration should stay under ~16ms where we optimized.
     - Long tasks (e.g. &gt;16ms) should not sit in the same window as the main tap/click.
     - GTM/Tawk script execution should appear after idle or first interaction, not at initial load.

2. **Optional: INP attribution in dev**
   - Use `startInpAttributionObserver()` from `@/lib/performance/inp-kpi` in development to log event timing entries (click/keydown/pointerdown) and their durations. Compare before/after changes.

3. **Google Search Console**
   - After deploy, open the INP issue for the affected URL group.
   - Use “Validate fix” so Google re-crawls and re-evaluates.
   - CrUX data updates over a ~28-day window; allow time for field data to refresh before judging success.

4. **Target constants**
   - See `core/frontend/lib/performance/inp-kpi.ts`: `INP_TARGET_MS` (200), `LONG_TASK_THRESHOLD_MS` (16). Use these when judging trace and tooling output.

## Baseline Scenarios (from plan)

- `filter_submit_search`
- `quick_filter_apply`
- `sort_dropdown_change`
- `listing_card_click`
- `scroll_filters_zone`

Run at least these when capturing before/after traces.
