import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPoOrderNumberTenantUnique1787000000000 implements MigrationInterface {
  name = 'FixPoOrderNumberTenantUnique1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the global UNIQUE(order_number) constraint — wrong for multi-tenant.
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        DROP CONSTRAINT IF EXISTS "UQ_b297010fff05faf7baf4e67afa7"
    `);

    // Add a per-tenant unique constraint so each tenant has its own
    // BC-YYYY-NNNN sequence without colliding with other tenants.
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        ADD CONSTRAINT "UQ_po_tenant_order_number"
        UNIQUE ("tenant_id", "order_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        DROP CONSTRAINT IF EXISTS "UQ_po_tenant_order_number"
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
        ADD CONSTRAINT "UQ_b297010fff05faf7baf4e67afa7"
        UNIQUE ("order_number")
    `);
  }
}
