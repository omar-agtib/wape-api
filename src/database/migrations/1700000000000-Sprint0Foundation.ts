import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint0Foundation1700000000000 implements MigrationInterface {
  name = 'Sprint0Foundation1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Tenants ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"             VARCHAR(255) NOT NULL,
        "slug"             VARCHAR(100) NOT NULL UNIQUE,
        "slug_prefix"      VARCHAR(4)   NOT NULL,
        "default_currency" VARCHAR(3)   NOT NULL DEFAULT 'MAD',
        "is_active"        BOOLEAN      NOT NULL DEFAULT true,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // ── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin','project_manager','site_manager','accountant','viewer');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE project_status AS ENUM ('planned','on_progress','completed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('planned','on_progress','completed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE tool_status AS ENUM ('available','in_use','maintenance','retired');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE stock_movement_type AS ENUM ('reserved','consumed','incoming');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE contact_type AS ENUM ('supplier','client','subcontractor');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE purchase_order_status AS ENUM ('draft','confirmed','partial','completed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE reception_status AS ENUM ('pending','partial','completed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE attachment_status AS ENUM ('draft','confirmed','invoiced');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE attachment_type AS ENUM ('external','internal');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM ('pending_validation','validated','paid');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE nc_status AS ENUM ('open','in_review','closed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Shared updated_at trigger function ────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ── Users ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id"     UUID         NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
        "email"         VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR      NOT NULL,
        "full_name"     VARCHAR(255) NOT NULL,
        "role"          user_role    NOT NULL DEFAULT 'viewer',
        "is_active"     BOOLEAN      NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMPTZ,
        UNIQUE(tenant_id, email)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_users_tenant ON users(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column;`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS nc_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS invoice_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS attachment_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS attachment_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS reception_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS purchase_order_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS contact_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS stock_movement_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS tool_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS project_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants";`);
  }
}
