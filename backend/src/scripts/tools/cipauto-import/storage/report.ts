import * as fs from 'fs';
import * as path from 'path';

import type {
  CipautoBrandsModelsAuditReport,
  ImportReport,
  RegistryItem,
  RuntimeEnv,
} from '../types';

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
    const completedAt = new Date().toISOString();
    const startedMs = Date.parse(input.startedAt);
    const completedMs = Date.parse(completedAt);
    const elapsedMs = Number.isFinite(startedMs) ? Math.max(0, completedMs - startedMs) : 0;

    const failedItems: ImportReport['failedItems'] = [];
    const manualReviewItems: ImportReport['manualReviewItems'] = [];
    const unmappedValues = {
      bodyTypes: new Set<string>(),
      fuelTypes: new Set<string>(),
      colors: new Set<string>(),
      transmissions: new Set<string>(),
      driveTypes: new Set<string>(),
      equipmentSlugs: new Set<string>(),
      equipmentLabels: new Set<string>(),
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let manualReview = 0;
    let pdpParsed = 0;
    let listingsDiscovered = 0;
    let totalImages = 0;
    let imageFailures = 0;

    for (const item of input.items) {
      listingsDiscovered += 1;
      if (item.state === 'pdp_parsed') pdpParsed += 1;
      if (item.state === 'created') created += 1;
      if (item.state === 'updated') updated += 1;
      if (item.state === 'skipped') skipped += 1;
      if (item.state === 'failed') {
        failed += 1;
        failedItems.push({
          sourceListingId: item.sourceListingId,
          url: item.url,
          error: item.error ?? 'Unknown error',
        });
      }
      if (item.state === 'manual_review') {
        manualReview += 1;
        manualReviewItems.push({
          sourceListingId: item.sourceListingId,
          url: item.url,
          reason: item.error ?? 'Manual review required',
        });
      }
      totalImages += item.imageCount ?? 0;
      imageFailures += item.imageFailures ?? 0;
      for (const warning of item.warnings ?? []) {
        collectUnmappedWarning(warning, unmappedValues);
      }
    }

    return {
      startedAt: input.startedAt,
      completedAt,
      elapsedMs,
      env: input.env,
      userId: input.userId,
      status: input.status as ImportReport['status'],
      flags: input.flags ?? {},
      summary: {
        pagesScanned: Number(input.flags?.pagesScanned ?? 0),
        listingsDiscovered,
        pdpParsed,
        created,
        updated,
        skipped,
        failed,
        manualReview,
        totalImages,
        imageFailures,
      },
      unmappedValues: {
        bodyTypes: [...unmappedValues.bodyTypes],
        fuelTypes: [...unmappedValues.fuelTypes],
        colors: [...unmappedValues.colors],
        transmissions: [...unmappedValues.transmissions],
        driveTypes: [...unmappedValues.driveTypes],
        equipmentSlugs: [...unmappedValues.equipmentSlugs],
        equipmentLabels: [...unmappedValues.equipmentLabels],
      },
      failedItems,
      manualReviewItems,
    };
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

function collectUnmappedWarning(
  warning: string,
  target: {
    bodyTypes: Set<string>;
    fuelTypes: Set<string>;
    colors: Set<string>;
    transmissions: Set<string>;
    driveTypes: Set<string>;
    equipmentSlugs: Set<string>;
    equipmentLabels: Set<string>;
  },
): void {
  const body = warning.match(/^UNMAPPED_BODY:(.+)$/);
  if (body) {
    target.bodyTypes.add(body[1].trim());
    return;
  }
  const fuel = warning.match(/^UNMAPPED_FUEL:(.+)$/);
  if (fuel) {
    target.fuelTypes.add(fuel[1].trim());
    return;
  }
  const color = warning.match(/^UNMAPPED_COLOR:(.+)$/);
  if (color) {
    target.colors.add(color[1].trim());
    return;
  }
  const transmission = warning.match(/^UNMAPPED_TRANSMISSION:(.+)$/);
  if (transmission) {
    target.transmissions.add(transmission[1].trim());
    return;
  }

  const drive = warning.match(/^UNMAPPED_DRIVE:(.+)$/);
  if (drive) {
    target.driveTypes.add(drive[1].trim());
    return;
  }

  const equipSlug = warning.match(/^UNMAPPED_EQUIPMENT_SLUG:(.+)$/);
  if (equipSlug) {
    target.equipmentSlugs.add(equipSlug[1].trim());
    return;
  }

  const equipLabel = warning.match(/^UNMAPPED_EQUIPMENT_LABEL:(.+)$/);
  if (equipLabel) {
    target.equipmentLabels.add(equipLabel[1].trim());
    return;
  }
}
