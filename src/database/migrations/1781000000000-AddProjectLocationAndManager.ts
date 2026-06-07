import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectLocationAndManager1781000000000 implements MigrationInterface {
  name = 'AddProjectLocationAndManager1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "location" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "manager_id" UUID
    `);

    // Foreign key: manager_id → users(id). ON DELETE SET NULL so removing a
    // user doesn't delete their projects, just clears the manager.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "FK_projects_manager_id"
          FOREIGN KEY ("manager_id") REFERENCES "users"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_manager"
        ON "projects" ("manager_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_projects_manager"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_manager_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "manager_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "location"`,
    );
  }
}
