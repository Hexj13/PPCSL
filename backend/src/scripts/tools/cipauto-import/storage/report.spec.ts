import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ReportStore } from './report';

describe('cipauto-import report', () => {
  it('collects UNMAPPED_DRIVE into unmappedValues.driveTypes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cipauto-report-'));
    const store = new ReportStore(tmpDir);

    const startedAt = new Date().toISOString();

    const report = store.build({
      startedAt,
      env: 'local',
      status: 'paused',
      flags: { pagesScanned: 1 },
      items: [
        {
          source: 'cipauto',
          sourceListingId: '1',
          url: 'https://cipauto.md/vehicul/1-car/',
          canonicalUrl: 'https://cipauto.md/vehicul/1-car/',
          state: 'failed',
          discoveredAt: startedAt,
          updatedAt: startedAt,
          warnings: ['UNMAPPED_DRIVE:Față'],
        },
      ] as any,
    });

    expect(report.unmappedValues.driveTypes).toContain('Față');
  });
});
