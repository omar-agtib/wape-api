import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectToToolMovements1784000000000 implements MigrationInterface {
  name = 'AddProjectToToolMovements1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tool_movements"
        ADD COLUMN IF NOT EXISTS "project_id" UUID
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tool_movements"
          ADD CONSTRAINT "FK_tool_movements_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tool_movements_project"
        ON "tool_movements" ("project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tool_movements_project"`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tool_movements" DROP CONSTRAINT "FK_tool_movements_project";
      EXCEPTION WHEN undefined_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "tool_movements" DROP COLUMN IF EXISTS "project_id"
    `);
  }
}
