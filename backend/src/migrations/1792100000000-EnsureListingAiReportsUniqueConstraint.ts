import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableUnique } from 'typeorm';

export class EnsureListingAiReportsUniqueConstraint1792100000000 implements MigrationInterface {
  name = 'EnsureListingAiReportsUniqueConstraint1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listing_ai_reports');
    if (!table) {
      return;
    }

    const hasCompositeUnique = table.uniques.some(
      (u) =>
        u.columnNames.length === 3 &&
        u.columnNames.includes('listing_id') &&
        u.columnNames.includes('report_language') &&
        u.columnNames.includes('input_hash'),
    );
    if (hasCompositeUnique) {
      return;
    }

    await queryRunner.createUniqueConstraint(
      'listing_ai_reports',
      new TableUnique({
        name: 'UQ_listing_ai_reports_listing_lang_hash',
        columnNames: ['listing_id', 'report_language', 'input_hash'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listing_ai_reports');
    if (!table) {
      return;
    }
    const uq = table.uniques.find((u) => u.name === 'UQ_listing_ai_reports_listing_lang_hash');
    if (uq) {
      await queryRunner.dropUniqueConstraint('listing_ai_reports', uq);
    }
  }
}
