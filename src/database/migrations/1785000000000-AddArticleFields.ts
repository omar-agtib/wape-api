import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArticleFields1785000000000 implements MigrationInterface {
  name = 'AddArticleFields1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles"
        ADD COLUMN IF NOT EXISTS "storage_location" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "description" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "articles"
        DROP COLUMN IF EXISTS "storage_location",
        DROP COLUMN IF EXISTS "description"
    `);
  }
}
