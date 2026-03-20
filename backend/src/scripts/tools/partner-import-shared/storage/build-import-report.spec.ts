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
});
