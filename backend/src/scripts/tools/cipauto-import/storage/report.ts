import * as fs from 'fs';
import * as path from 'path';

import type { ImportReport } from '../../partner-import-shared/import-workflow-types';
import { buildImportReport } from '../../partner-import-shared/storage/build-import-report';
import type { CipautoBrandsModelsAuditReport, RegistryItem, RuntimeEnv } from '../types';

interface BuildReportInput {
  startedAt: string;
  env: RuntimeEnv;
  userId?: string;
  status?: string;
  flags?: Record<string, unknown>;
  items: RegistryItem[];
}

export class ReportStore {
  constructor(private readonly reportsDir: string) {}

  build(input: BuildReportInput): ImportReport {
    return buildImportReport(input);
  }

  save(report: ImportReport): string {
    this.ensureDir();
    const timestamp = report.completedAt.replace(/[:.]/g, '-');
    const filePath = path.join(this.reportsDir, `cipauto-run-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
  }

  saveBrandsModelsAudit(report: CipautoBrandsModelsAuditReport): string {
    this.ensureDir();
    const timestamp = report.completedAt.replace(/[:.]/g, '-');
    const filePath = path.join(this.reportsDir, `cipauto-brands-models-audit-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
  }

  getLatestReportPath(): string | null {
    this.ensureDir();
    const files = fs
      .readdirSync(this.reportsDir)
      .filter((file) => file.startsWith('cipauto-run-') && file.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b));
    if (files.length === 0) {
      return null;
    }
    return path.join(this.reportsDir, files[files.length - 1]);
  }

  read(filePath: string): ImportReport {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ImportReport;
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }
}
