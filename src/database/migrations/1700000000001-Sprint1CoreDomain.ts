import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint1CoreDomain1700000000001 implements MigrationInterface {
  name = 'Sprint1CoreDomain1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Personnel ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personnel" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"     UUID          NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        "full_name"     VARCHAR(255)  NOT NULL,
        "role"          VARCHAR(100)  NOT NULL,
        "cost_per_hour" DECIMAL(10,2) NOT NULL CHECK(cost_per_hour >= 0),
        "currency"      VARCHAR(3)    NOT NULL DEFAULT 'MAD',
        "email"         VARCHAR(255),
        "phone"         VARCHAR(30),
        "address"       TEXT,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMPTZ,
        UNIQUE(tenant_id, email)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_personnel_tenant ON personnel(tenant_id);`);

    // ── Projects ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"   UUID           NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        "name"        VARCHAR(255)   NOT NULL,
        "client_id"   UUID,
        "description" TEXT,
        "budget"      DECIMAL(15,2)  NOT NULL CHECK(budget > 0),
        "currency"    VARCHAR(3)     NOT NULL DEFAULT 'MAD',
        "start_date"  DATE           NOT NULL,
        "end_date"    DATE           NOT NULL CHECK(end_date > start_date),
        "status"      project_status NOT NULL DEFAULT 'planned',
        "progress"    DECIMAL(5,2)   NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
        "created_by"  UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        "created_at"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMPTZ
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status) WHERE deleted_at IS NULL;`);

    // ── Finance Snapshots ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_finance_snapshots" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id"       UUID          NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        "total_budget"     DECIMAL(15,2) NOT NULL DEFAULT 0,
        "total_spent"      DECIMAL(15,2) NOT NULL DEFAULT 0,
        "remaining_budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "spent_personnel"  DECIMAL(15,2) NOT NULL DEFAULT 0,
        "spent_articles"   DECIMAL(15,2) NOT NULL DEFAULT 0,
        "spent_tools"      DECIMAL(15,2) NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "last_updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ── Tasks ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"      UUID          NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        "project_id"     UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "name"           VARCHAR(255)  NOT NULL,
        "description"    TEXT,
        "start_date"     DATE          NOT NULL,
        "end_date"       DATE          NOT NULL CHECK(end_date >= start_date),
        "status"         task_status   NOT NULL DEFAULT 'planned',
        "progress"       DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
        "estimated_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "actual_cost"    DECIMAL(15,2),
        "currency"       VARCHAR(3)    NOT NULL DEFAULT 'MAD',
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "deleted_at"     TIMESTAMPTZ
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);`);
    await queryRunner.query(`CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);`);

    // ── Task Personnel ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_personnel" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id"      UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        "personnel_id" UUID          NOT NULL REFERENCES personnel(id) ON DELETE RESTRICT,
        "quantity"     DECIMAL(10,2) NOT NULL CHECK(quantity > 0),
        "unit_cost"    DECIMAL(10,2) NOT NULL CHECK(unit_cost >= 0),
        "currency"     VARCHAR(3)    NOT NULL DEFAULT 'MAD',
        "total_cost"   DECIMAL(15,2) NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_task_personnel_task ON task_personnel(task_id);`);

    // ── W-P1 Trigger: task status change → project status + progress ──────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_update_project_from_tasks()
      RETURNS TRIGGER AS $$
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

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_tasks_update_project ON tasks;
      CREATE TRIGGER trg_tasks_update_project
        AFTER INSERT OR UPDATE OF status, progress ON tasks
        FOR EACH ROW EXECUTE FUNCTION fn_update_project_from_tasks();
    `);

    // ── updated_at triggers for new tables ────────────────────────────────────
    for (const table of ['personnel', 'projects', 'project_finance_snapshots', 'tasks', 'task_personnel']) {
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}";
        CREATE TRIGGER trg_${table}_updated_at
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_tasks_update_project ON tasks;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_update_project_from_tasks;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_personnel";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_finance_snapshots";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "personnel";`);
  }
}