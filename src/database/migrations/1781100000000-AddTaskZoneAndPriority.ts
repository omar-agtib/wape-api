import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskZoneAndPriority1781100000000 implements MigrationInterface {
  name = 'AddTaskZoneAndPriority1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Create the priority enum type (if it doesn't already exist)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasks_priority_enum" AS ENUM ('low', 'medium', 'high');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 2) Add the two new columns
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN IF NOT EXISTS "zone" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "priority" "tasks_priority_enum"
          NOT NULL DEFAULT 'medium'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "priority"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "zone"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum"`);
  }
}
