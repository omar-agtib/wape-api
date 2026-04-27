import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTrigger1776702041511 implements MigrationInterface {
  name = 'FixTrigger1776702041511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_tasks_update_project ON tasks;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_update_project_from_tasks()
      RETURNS TRIGGER AS $$
      DECLARE
        v_project_id UUID;
        v_avg_progress DECIMAL;
        v_has_on_progress BOOLEAN;
        v_all_completed BOOLEAN;
        v_task_count INT;
        v_current_status TEXT;
      BEGIN
        v_project_id := NEW.project_id;

        SELECT
          COUNT(*),
          ROUND(AVG(progress)::numeric, 2),
          BOOL_OR(status = 'on_progress'),
          BOOL_AND(status = 'completed')
        INTO v_task_count, v_avg_progress, v_has_on_progress, v_all_completed
        FROM tasks
        WHERE project_id = v_project_id AND deleted_at IS NULL;

        SELECT status::TEXT INTO v_current_status FROM projects WHERE id = v_project_id;

        UPDATE projects SET
          progress = COALESCE(v_avg_progress, 0),
          status = CASE
            WHEN v_task_count = 0 THEN v_current_status::"public"."projects_status_enum"
            WHEN v_all_completed THEN 'completed'::"public"."projects_status_enum"
            WHEN v_has_on_progress AND v_current_status = 'planned' THEN 'on_progress'::"public"."projects_status_enum"
            ELSE v_current_status::"public"."projects_status_enum"
          END,
          updated_at = NOW()
        WHERE id = v_project_id;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_tasks_update_project
        AFTER INSERT OR UPDATE OF status, progress ON tasks
        FOR EACH ROW EXECUTE FUNCTION fn_update_project_from_tasks();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_tasks_update_project ON tasks;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_update_project_from_tasks;`,
    );
  }
}
