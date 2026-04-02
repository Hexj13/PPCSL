import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerProgramFields1803000000000 implements MigrationInterface {
  name = 'AddPartnerProgramFields1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const promotionHistoryTable = await queryRunner.getTable('promotion_history');

    if (!usersTable?.findColumnByName('is_platform_partner')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "is_platform_partner" boolean NOT NULL DEFAULT false`,
      );
    }

    if (!usersTable?.findColumnByName('free_promotion_balance')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "free_promotion_balance" integer NOT NULL DEFAULT 0`,
      );
    }

    if (!usersTable?.findColumnByName('partner_listing_progress')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "partner_listing_progress" integer NOT NULL DEFAULT 0`,
      );
    }

    if (!usersTable?.indices.find((index) => index.name === 'IDX_users_is_platform_partner')) {
      await queryRunner.query(
        `CREATE INDEX "IDX_users_is_platform_partner" ON "users" ("is_platform_partner")`,
      );
    }

    if (!promotionHistoryTable?.findColumnByName('promotion_source')) {
      await queryRunner.query(
        `ALTER TABLE "promotion_history" ADD "promotion_source" varchar NOT NULL DEFAULT 'duration'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const promotionHistoryTable = await queryRunner.getTable('promotion_history');

    if (promotionHistoryTable?.findColumnByName('promotion_source')) {
      await queryRunner.query(`ALTER TABLE "promotion_history" DROP COLUMN "promotion_source"`);
    }

    if (usersTable?.indices.find((index) => index.name === 'IDX_users_is_platform_partner')) {
      await queryRunner.query(`DROP INDEX "public"."IDX_users_is_platform_partner"`);
    }

    if (usersTable?.findColumnByName('partner_listing_progress')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "partner_listing_progress"`);
    }

    if (usersTable?.findColumnByName('free_promotion_balance')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "free_promotion_balance"`);
    }

    if (usersTable?.findColumnByName('is_platform_partner')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_platform_partner"`);
    }
  }
}
