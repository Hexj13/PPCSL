import { selectRegistryItemsForRunReport } from './select-run-report-items';

describe('selectRegistryItemsForRunReport', () => {
  it('returns only items updated at or after the run start timestamp', () => {
    const items = [
      { id: 'old', updatedAt: '2026-04-15T12:05:00.000Z' },
      { id: 'fresh', updatedAt: '2026-04-15T12:10:00.000Z' },
      { id: 'same', updatedAt: '2026-04-15T12:07:00.000Z' },
    ];

    const result = selectRegistryItemsForRunReport(items, '2026-04-15T12:07:00.000Z');

    expect(result.map((item) => item.id)).toEqual(['fresh', 'same']);
  });

  it('returns an empty array when nothing was touched during the run', () => {
    const items = [{ id: 'a', updatedAt: '2026-04-15T10:00:00.000Z' }];

    const result = selectRegistryItemsForRunReport(items, '2026-04-15T12:00:00.000Z');

    expect(result).toEqual([]);
  });
});
