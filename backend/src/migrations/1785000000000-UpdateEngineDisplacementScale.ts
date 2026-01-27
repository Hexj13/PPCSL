import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEngineDisplacementScale1785000000000 implements MigrationInterface {
  name = 'UpdateEngineDisplacementScale1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const column = await queryRunner.query(`
      SELECT numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'vehicles' AND column_name = 'engine_displ_l'
    `);

    if (column.length === 0) {
      return;
    }

    const { numeric_precision, numeric_scale } = column[0];
    if (Number(numeric_precision) !== 5 || Number(numeric_scale) !== 3) {
      await queryRunner.query(
        `ALTER TABLE "vehicles" ALTER COLUMN "engine_displ_l" TYPE numeric(5,3) USING "engine_displ_l"::numeric(5,3)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "engine_displ_l" TYPE numeric(5,1) USING "engine_displ_l"::numeric(5,1)`,
    );
  }
}
