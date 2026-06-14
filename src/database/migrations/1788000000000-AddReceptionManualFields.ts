import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceptionManualFields1788000000000 implements MigrationInterface {
  name = 'AddReceptionManualFields1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── New nullable columns ───────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "receptions" ADD "supplier_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD "supplier_name" text`,
    );
    await queryRunner.query(`ALTER TABLE "receptions" ADD "project_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD "delivery_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD "rejected_quantity" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD "received_by_name" text`,
    );

    // ── Relax PO-derived columns to nullable (manual receptions have no PO) ──
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "purchase_order_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "purchase_order_line_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "article_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "expected_quantity" DROP NOT NULL`,
    );

    // ── tenant_id: add nullable → backfill from parent PO → enforce NOT NULL ─
    await queryRunner.query(`ALTER TABLE "receptions" ADD "tenant_id" uuid`);
    await queryRunner.query(
      `UPDATE "receptions" r
       SET "tenant_id" = po."tenant_id"
       FROM "purchase_orders" po
       WHERE r."purchase_order_id" = po."id"
         AND r."tenant_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receptions" DROP COLUMN "tenant_id"`);
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "received_by_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "rejected_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "delivery_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "supplier_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "supplier_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "expected_quantity" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "article_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "purchase_order_line_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ALTER COLUMN "purchase_order_id" SET NOT NULL`,
    );
  }
}
