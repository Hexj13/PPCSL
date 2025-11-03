import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddViewsToListings1762194843300 implements MigrationInterface {
  name = 'AddViewsToListings1762194843300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" ADD "views" integer NOT NULL DEFAULT 0`);

    await queryRunner.createTable(
      new Table({
        name: 'listing_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'listing_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'visitor_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['listing_id'],
            referencedTableName: 'listings',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_listing_views_listing_user" ON "listing_views" ("listing_id", "user_id") WHERE "user_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_listing_views_listing_visitor" ON "listing_views" ("listing_id", "visitor_id") WHERE "visitor_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listing_views_listing_visitor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listing_views_listing_user"`);
    await queryRunner.dropTable('listing_views');
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "views"`);
  }
}
