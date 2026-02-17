import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyWebsiteUrlToUser1787000000000 implements MigrationInterface {
  name = 'AddCompanyWebsiteUrlToUser1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('company_website_url');
    if (!column) {
      await queryRunner.query(`
        ALTER TABLE "users" ADD "company_website_url" varchar NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('company_website_url');
    if (column) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company_website_url"`);
    }
  }
}
