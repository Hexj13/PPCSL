import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableIndex } from 'typeorm';

export class AddPromotedField1778000000000 implements MigrationInterface {
  name = 'AddPromotedField1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const isPromotedColumn = table?.findColumnByName('is_promoted');
    if (!isPromotedColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "is_promoted" boolean NOT NULL DEFAULT false
      `);
    }

    const promotedUntilColumn = table?.findColumnByName('promoted_until');
    if (!promotedUntilColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "promoted_until" timestamp NULL
      `);
    }

    const promotedStartedAtColumn = table?.findColumnByName('promoted_started_at');
    if (!promotedStartedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "promoted_started_at" timestamp NULL
      `);
    }

    const promotedPausedAtColumn = table?.findColumnByName('promoted_paused_at');
    if (!promotedPausedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "promoted_paused_at" timestamp NULL
      `);
    }

    const isPromotedIndex = table?.indices.find((idx) => idx.name === 'idx_listings_is_promoted');
    if (!isPromotedIndex) {
      await queryRunner.createIndex(
        'listings',
        new TableIndex({
          name: 'idx_listings_is_promoted',
          columnNames: ['is_promoted'],
          where: '"is_promoted" = true',
        }),
      );
    }

    const promotedUntilIndex = table?.indices.find(
      (idx) => idx.name === 'idx_listings_promoted_until',
    );
    if (!promotedUntilIndex) {
      await queryRunner.createIndex(
        'listings',
        new TableIndex({
          name: 'idx_listings_promoted_until',
          columnNames: ['promoted_until'],
          where: '"promoted_until" IS NOT NULL',
        }),
      );
    }

    const statusPromotedCreatedIndex = table?.indices.find(
      (idx) => idx.name === 'idx_listings_status_promoted_created',
    );
    if (!statusPromotedCreatedIndex) {
      await queryRunner.createIndex(
        'listings',
        new TableIndex({
          name: 'idx_listings_status_promoted_created',
          columnNames: ['status', 'is_promoted', 'created_at'],
          where: '"status" = \'Active\'',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const statusPromotedCreatedIndex = table?.indices.find(
      (idx) => idx.name === 'idx_listings_status_promoted_created',
    );
    if (statusPromotedCreatedIndex) {
      await queryRunner.dropIndex('listings', 'idx_listings_status_promoted_created');
    }

    const promotedUntilIndex = table?.indices.find(
      (idx) => idx.name === 'idx_listings_promoted_until',
    );
    if (promotedUntilIndex) {
      await queryRunner.dropIndex('listings', 'idx_listings_promoted_until');
    }

    const isPromotedIndex = table?.indices.find((idx) => idx.name === 'idx_listings_is_promoted');
    if (isPromotedIndex) {
      await queryRunner.dropIndex('listings', 'idx_listings_is_promoted');
    }

    const promotedPausedAtColumn = table?.findColumnByName('promoted_paused_at');
    if (promotedPausedAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "promoted_paused_at"`);
    }

    const promotedStartedAtColumn = table?.findColumnByName('promoted_started_at');
    if (promotedStartedAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "promoted_started_at"`);
    }

    const promotedUntilColumn = table?.findColumnByName('promoted_until');
    if (promotedUntilColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "promoted_until"`);
    }

    const isPromotedColumn = table?.findColumnByName('is_promoted');
    if (isPromotedColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "is_promoted"`);
    }
  }
}
