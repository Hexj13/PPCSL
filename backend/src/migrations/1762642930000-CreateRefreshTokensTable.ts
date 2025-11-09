import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1762642930000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1762642930000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refresh_tokens');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE "refresh_tokens" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "user_id" uuid NOT NULL,
          "token" text NOT NULL,
          "expires_at" timestamp NOT NULL,
          "revoked" boolean NOT NULL DEFAULT false,
          "created_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
          CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") 
            REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        )
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_refresh_tokens_token" ON "refresh_tokens" ("token")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refresh_tokens');
    if (table) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_expires_at"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_user_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_token"`);
      await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }
  }
}
