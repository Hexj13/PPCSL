import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendTireTreadAndOptions1793000000000 implements MigrationInterface {
  name = 'ExtendTireTreadAndOptions1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newSeasonValues = ['mud_at', 'mud_mt', 'mud_rt', 'sport_semi_slick', 'race_slick'];
    for (const v of newSeasonValues) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'tire_season_enum' AND e.enumlabel = '${v}'
          ) THEN
            ALTER TYPE tire_season_enum ADD VALUE '${v}';
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "tires" ADD COLUMN IF NOT EXISTS "spare_donut" boolean
    `);
    await queryRunner.query(`
      ALTER TABLE "tires" ADD COLUMN IF NOT EXISTS "tubeless" boolean
    `);
    await queryRunner.query(`
      ALTER TABLE "tires" ADD COLUMN IF NOT EXISTS "acoustic" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tires" DROP COLUMN IF EXISTS "acoustic"`);
    await queryRunner.query(`ALTER TABLE "tires" DROP COLUMN IF EXISTS "tubeless"`);
    await queryRunner.query(`ALTER TABLE "tires" DROP COLUMN IF EXISTS "spare_donut"`);
  }
}
