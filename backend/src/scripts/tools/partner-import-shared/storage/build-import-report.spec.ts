import { buildImportReport } from './build-import-report';

describe('buildImportReport', () => {
  it('collects UNMAPPED_DRIVE into unmappedValues.driveTypes', () => {
    const startedAt = new Date().toISOString();

    const report = buildImportReport({
      startedAt,
      env: 'local',
      status: 'paused',
      flags: { pagesScanned: 1 },
      items: [
        {
          state: 'failed',
          sourceListingId: '1',
          url: 'https://example.com/1',
          warnings: ['UNMAPPED_DRIVE:Față'],
        },
      ],
    });

    expect(report.unmappedValues.driveTypes).toContain('Față');
  });

  it('counts duplicate_skipped and fills duplicateSkippedItems', () => {
    const startedAt = new Date().toISOString();
    const report = buildImportReport({
      startedAt,
      env: 'local',
      status: 'paused',
      flags: {},
      items: [
        {
          state: 'duplicate_skipped',
          sourceListingId: 's1',
          url: 'https://example.com/s1',
          error: 'DUPLICATE_MATCH:vin',
          kupitoListingId: 'listing-uuid',
        },
      ],
    });
    expect(report.summary.duplicateSkipped).toBe(1);
    expect(report.duplicateSkippedItems).toHaveLength(1);
    expect(report.duplicateSkippedItems[0].layer).toBe('vin');
    expect(report.duplicateSkippedItems[0].matchedKupitoListingId).toBe('listing-uuid');
  });
});
