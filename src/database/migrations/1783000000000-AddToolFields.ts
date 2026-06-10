import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToolFields1783000000000 implements MigrationInterface {
  name = 'AddToolFields1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tools"
        ADD COLUMN IF NOT EXISTS "location" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "purchase_date" DATE,
        ADD COLUMN IF NOT EXISTS "purchase_cost" NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS "assigned_project_id" UUID
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tools"
          ADD CONSTRAINT "FK_tools_assigned_project"
          FOREIGN KEY ("assigned_project_id") REFERENCES "projects"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tools_assigned_project"
        ON "tools" ("assigned_project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tools_assigned_project"`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tools" DROP CONSTRAINT "FK_tools_assigned_project";
      EXCEPTION WHEN undefined_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "tools"
        DROP COLUMN IF EXISTS "location",
        DROP COLUMN IF EXISTS "purchase_date",
        DROP COLUMN IF EXISTS "purchase_cost",
        DROP COLUMN IF EXISTS "assigned_project_id"
    `);
  }
}
