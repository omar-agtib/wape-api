import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonnelHrFields1782000000000 implements MigrationInterface {
  name = 'AddPersonnelHrFields1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Enum types (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "personnel_status_enum" AS ENUM ('active', 'on_leave', 'inactive');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "personnel_contract_type_enum" AS ENUM ('cdi', 'cdd', 'temporary', 'internship', 'freelance');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 2) Add columns
    await queryRunner.query(`
      ALTER TABLE "personnel"
        ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "status" "personnel_status_enum" NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "contract_type" "personnel_contract_type_enum",
        ADD COLUMN IF NOT EXISTS "contract_start" DATE,
        ADD COLUMN IF NOT EXISTS "contract_end" DATE,
        ADD COLUMN IF NOT EXISTS "weekly_hours" NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS "salary" NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS "assigned_project_id" UUID
    `);

    // 3) FK for assigned project (set null if project deleted)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "personnel"
          ADD CONSTRAINT "FK_personnel_assigned_project"
          FOREIGN KEY ("assigned_project_id") REFERENCES "projects"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_personnel_assigned_project"
        ON "personnel" ("assigned_project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_personnel_assigned_project"`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "personnel" DROP CONSTRAINT "FK_personnel_assigned_project";
      EXCEPTION WHEN undefined_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "personnel"
        DROP COLUMN IF EXISTS "job_title",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "contract_type",
        DROP COLUMN IF EXISTS "contract_start",
        DROP COLUMN IF EXISTS "contract_end",
        DROP COLUMN IF EXISTS "weekly_hours",
        DROP COLUMN IF EXISTS "salary",
        DROP COLUMN IF EXISTS "assigned_project_id"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "personnel_contract_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "personnel_status_enum"`);
  }
}
