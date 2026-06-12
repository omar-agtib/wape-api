import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoExpectedDeliveryAndCancelled1786000000000 implements MigrationInterface {
  name = 'AddPoExpectedDeliveryAndCancelled1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add 'cancelled' to the purchase order status enum (idempotent).
    //    ADD VALUE IF NOT EXISTS is safe and supported on PG 12+.
    await queryRunner.query(`
      ALTER TYPE "purchase_orders_status_enum"
        ADD VALUE IF NOT EXISTS 'cancelled'
    `);

    // 2) Add expected_delivery column.
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        ADD COLUMN IF NOT EXISTS "expected_delivery" DATE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        DROP COLUMN IF EXISTS "expected_delivery"
    `);
    // NOTE: PostgreSQL cannot easily remove a value from an enum type,
    // so 'cancelled' is left in place on rollback (harmless).
  }
}
