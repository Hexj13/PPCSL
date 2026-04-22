import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushDevicesTable1792000000000 implements MigrationInterface {
  name = 'CreatePushDevicesTable1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('push_devices');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE "push_devices" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "user_id" uuid NOT NULL,
          "push_token" text NOT NULL,
          "platform" character varying(16) NOT NULL,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_push_devices" PRIMARY KEY ("id"),
          CONSTRAINT "FK_push_devices_user" FOREIGN KEY ("user_id")
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_push_devices_user_token"
        ON "push_devices" ("user_id", "push_token")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('push_devices');
    if (table) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_devices_user_token"`);
      await queryRunner.query(`DROP TABLE "push_devices"`);
    }
  }
}
