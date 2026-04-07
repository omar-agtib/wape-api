import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint7Indexes1700000000002 implements MigrationInterface {
  name = 'Sprint7Indexes1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Projects ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_tenant_status
        ON projects(tenant_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_client
        ON projects(client_id)
        WHERE deleted_at IS NULL;
    `);

    // ── Tasks ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_status
        ON tasks(project_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status
        ON tasks(tenant_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_dates
        ON tasks(start_date, end_date);
    `);

    // ── Task resources ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_personnel_task ON task_personnel(task_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_personnel_personnel ON task_personnel(personnel_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_articles_task ON task_articles(task_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_articles_article ON task_articles(article_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_tools_task ON task_tools(task_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_task_tools_tool ON task_tools(tool_id);`,
    );

    // ── Personnel ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_personnel_tenant
        ON personnel(tenant_id)
        WHERE deleted_at IS NULL;
    `);

    // ── Tools ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tools_tenant_status
        ON tools(tenant_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tool_movements_tool_date
        ON tool_movements(tool_id, movement_date DESC);
    `);

    // ── Articles + Stock ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_tenant
        ON articles(tenant_id)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_barcode
        ON articles(barcode_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_article_date
        ON stock_movements(article_id, movement_date DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_task
        ON stock_movements(task_id)
        WHERE task_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_project
        ON stock_movements(project_id)
        WHERE project_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type
        ON stock_movements(tenant_id, movement_type);
    `);

    // ── Contacts ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type
        ON contacts(tenant_id, contact_type)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_documents_contact
        ON contact_documents(contact_id);
    `);

    // ── Purchase Orders ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_tenant_status
        ON purchase_orders(tenant_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_supplier
        ON purchase_orders(supplier_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_project
        ON purchase_orders(project_id)
        WHERE project_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_lines_po
        ON purchase_order_lines(purchase_order_id);
    `);

    // ── Receptions ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_receptions_po
        ON receptions(purchase_order_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_receptions_article
        ON receptions(article_id);
    `);

    // ── Attachments ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attachments_project_status
        ON attachments(project_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attachments_subcontractor
        ON attachments(subcontractor_id)
        WHERE subcontractor_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attachment_tasks_attachment
        ON attachment_tasks(attachment_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attachment_tasks_task
        ON attachment_tasks(task_id);
    `);

    // ── Invoices ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
        ON invoices(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_project
        ON invoices(project_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_subcontractor
        ON invoices(subcontractor_id);
    `);

    // ── Finance Snapshot ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_snapshot_project
        ON project_finance_snapshots(project_id);
    `);

    // ── Non-Conformities ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nc_project_status
        ON non_conformities(project_id, status)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nc_images_nc
        ON nc_images(nc_id);
    `);

    // ── Documents ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_source
        ON documents(source_type, source_id)
        WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_tenant_date
        ON documents(tenant_id, uploaded_at DESC)
        WHERE deleted_at IS NULL;
    `);

    // ── Support Tickets ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status
        ON support_tickets(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
        ON ticket_messages(ticket_id, sent_at ASC);
    `);

    // ── Finance ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date
        ON transactions(tenant_id, payment_date DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type
        ON transactions(tenant_id, payment_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_project
        ON transactions(project_id)
        WHERE project_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_tenant_status
        ON supplier_payments(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_due_date
        ON supplier_payments(due_date)
        WHERE status IN ('pending', 'partially_paid');
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subcontractor_payments_tenant
        ON subcontractor_payments(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant
        ON subscriptions(tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_date
        ON subscriptions(next_billing_date)
        WHERE status NOT IN ('cancelled', 'expired');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'idx_projects_tenant_status',
      'idx_projects_client',
      'idx_tasks_project_status',
      'idx_tasks_tenant_status',
      'idx_tasks_dates',
      'idx_task_personnel_task',
      'idx_task_personnel_personnel',
      'idx_task_articles_task',
      'idx_task_articles_article',
      'idx_task_tools_task',
      'idx_task_tools_tool',
      'idx_personnel_tenant',
      'idx_tools_tenant_status',
      'idx_tool_movements_tool_date',
      'idx_articles_tenant',
      'idx_articles_barcode',
      'idx_stock_movements_article_date',
      'idx_stock_movements_task',
      'idx_stock_movements_project',
      'idx_stock_movements_type',
      'idx_contacts_tenant_type',
      'idx_contact_documents_contact',
      'idx_po_tenant_status',
      'idx_po_supplier',
      'idx_po_project',
      'idx_po_lines_po',
      'idx_receptions_po',
      'idx_receptions_article',
      'idx_attachments_project_status',
      'idx_attachments_subcontractor',
      'idx_attachment_tasks_attachment',
      'idx_attachment_tasks_task',
      'idx_invoices_tenant_status',
      'idx_invoices_project',
      'idx_invoices_subcontractor',
      'idx_finance_snapshot_project',
      'idx_nc_project_status',
      'idx_nc_images_nc',
      'idx_documents_source',
      'idx_documents_tenant_date',
      'idx_tickets_tenant_status',
      'idx_ticket_messages_ticket',
      'idx_transactions_tenant_date',
      'idx_transactions_type',
      'idx_transactions_project',
      'idx_supplier_payments_tenant_status',
      'idx_supplier_payments_due_date',
      'idx_subcontractor_payments_tenant',
      'idx_subscriptions_tenant',
      'idx_subscriptions_billing_date',
    ];
    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx};`);
    }
  }
}
