import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProjectStatusTriggerType1781200000000 implements MigrationInterface {
  name = 'FixProjectStatusTriggerType1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The trigger function referenced an outdated type name `project_status`.
    // The actual enum type is `projects_status_enum`. Recreate the function
    // with the correct type so task insert/update no longer fails.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_update_project_from_tasks()
      RETURNS trigger AS $$
      DECLARE
        v_project_id UUID;
        v_avg_progress DECIMAL;
        v_has_on_progress BOOLEAN;
        v_all_completed BOOLEAN;
        v_task_count INT;
        v_current_status projects_status_enum;
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
 
        SELECT status INTO v_current_status FROM projects WHERE id = v_project_id;
 
        UPDATE projects SET
          progress = COALESCE(v_avg_progress, 0),
          status = CASE
            WHEN v_task_count = 0 THEN v_current_status
            WHEN v_all_completed THEN 'completed'::projects_status_enum
            WHEN v_has_on_progress AND v_current_status = 'planned' THEN 'on_progress'::projects_status_enum
            ELSE v_current_status
          END,
          updated_at = NOW()
        WHERE id = v_project_id;
 
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the previous (broken) type reference. Kept for completeness;
    // you would not normally run this.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_update_project_from_tasks()
      RETURNS trigger AS $$
      DECLARE
        v_project_id UUID;
        v_avg_progress DECIMAL;
        v_has_on_progress BOOLEAN;
        v_all_completed BOOLEAN;
        v_task_count INT;
        v_current_status project_status;
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
 
        SELECT status INTO v_current_status FROM projects WHERE id = v_project_id;
 
        UPDATE projects SET
          progress = COALESCE(v_avg_progress, 0),
          status = CASE
            WHEN v_task_count = 0 THEN v_current_status
            WHEN v_all_completed THEN 'completed'::project_status
            WHEN v_has_on_progress AND v_current_status = 'planned' THEN 'on_progress'::project_status
            ELSE v_current_status
          END,
          updated_at = NOW()
        WHERE id = v_project_id;
 
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
