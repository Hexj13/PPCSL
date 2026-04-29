import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHidePartnerPromoBannerToUsers1810000000000 implements MigrationInterface {
  name = 'AddHidePartnerPromoBannerToUsers1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('hide_partner_promo_banner');

    if (!column) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "hide_partner_promo_banner" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('hide_partner_promo_banner');

    if (column) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "hide_partner_promo_banner"`);
    }
  }
}
