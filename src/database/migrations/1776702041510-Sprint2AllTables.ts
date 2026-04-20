import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint2AllTables1776702041510 implements MigrationInterface {
  name = 'Sprint2AllTables1776702041510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personnel" DROP CONSTRAINT "personnel_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "projects_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "projects_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_finance_snapshots" DROP CONSTRAINT "project_finance_snapshots_project_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_tenant_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "task_personnel_task_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "task_personnel_personnel_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_users_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_personnel_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_projects_tenant_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_project_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_task_personnel_task"`);
    await queryRunner.query(
      `ALTER TABLE "personnel" DROP CONSTRAINT "personnel_cost_per_hour_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "projects_budget_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "projects_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "projects_progress_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "tasks_progress_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "task_personnel_quantity_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "task_personnel_unit_cost_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_email_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personnel" DROP CONSTRAINT "personnel_tenant_id_email_key"`,
    );
    await queryRunner.query(
      `CREATE TABLE "articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(100) NOT NULL, "unit" character varying(50), "minimum_stock" integer NOT NULL DEFAULT '0', "unit_price" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "barcode_id" character varying(80) NOT NULL, "barcode_image_url" text, "stock_quantity" numeric(10,2) NOT NULL DEFAULT '0', "reserved_quantity" numeric(10,2) NOT NULL DEFAULT '0', "consumed_quantity" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "UQ_2db9b217fb14c5152322dc21f1d" UNIQUE ("barcode_id"), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "task_id" uuid NOT NULL, "article_id" uuid NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit_cost" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "total_cost" numeric(15,2) NOT NULL, CONSTRAINT "PK_b38036144e07ed3b099e41c5746" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tools_status_enum" AS ENUM('available', 'in_use', 'maintenance', 'retired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "category" character varying(100) NOT NULL, "serial_number" character varying(100), "photo_url" text, "status" "public"."tools_status_enum" NOT NULL DEFAULT 'available', CONSTRAINT "PK_e23d56734caad471277bad8bf85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_tools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "task_id" uuid NOT NULL, "tool_id" uuid NOT NULL, "quantity" numeric(10,2) NOT NULL, "unit_cost" numeric(10,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL DEFAULT 'MAD', "total_cost" numeric(15,2) NOT NULL, CONSTRAINT "PK_9642f86bc9da507409e75d12325" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tool_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tool_id" uuid NOT NULL, "movement_type" character varying(3) NOT NULL, "movement_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "responsible_id" uuid NOT NULL, "task_id" uuid, "is_auto" boolean NOT NULL DEFAULT false, "notes" text, CONSTRAINT "PK_ccf348526e2f1388adf691d5fdc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_movement_type_enum" AS ENUM('reserved', 'consumed', 'incoming')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "article_id" uuid NOT NULL, "movement_type" "public"."stock_movements_movement_type_enum" NOT NULL, "quantity" numeric(10,2) NOT NULL, "project_id" uuid, "task_id" uuid, "purchase_order_id" uuid, "responsible_id" uuid, "movement_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "notes" text, CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contacts_contact_type_enum" AS ENUM('supplier', 'client', 'subcontractor')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "contact_type" "public"."contacts_contact_type_enum" NOT NULL, "legal_name" character varying(255) NOT NULL, "if_number" character varying(50), "ice_number" character varying(50), "email" character varying(255), "phone" character varying(30), "address" text, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "document_name" character varying(255) NOT NULL, "document_type" character varying(50) NOT NULL, "file_url" text NOT NULL, "uploaded_by" uuid NOT NULL, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_a571c7bd089099fcfb377048e54" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."purchase_orders_status_enum" AS ENUM('draft', 'confirmed', 'partial', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "order_number" character varying(20) NOT NULL, "supplier_id" uuid NOT NULL, "project_id" uuid, "order_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "status" "public"."purchase_orders_status_enum" NOT NULL DEFAULT 'draft', "currency" character varying(3) NOT NULL DEFAULT 'MAD', "total_amount" numeric(15,2) NOT NULL DEFAULT '0', "notes" text, "created_by" uuid NOT NULL, CONSTRAINT "UQ_b297010fff05faf7baf4e67afa7" UNIQUE ("order_number"), CONSTRAINT "PK_05148947415204a897e8beb2553" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "purchase_order_id" uuid NOT NULL, "article_id" uuid NOT NULL, "ordered_quantity" numeric(10,2) NOT NULL, "received_quantity" numeric(10,2) NOT NULL DEFAULT '0', "unit_price" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "total_price" numeric(15,2) NOT NULL, CONSTRAINT "PK_34a2082d2abb10c5d8713bc19b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."receptions_status_enum" AS ENUM('pending', 'partial', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "receptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "purchase_order_id" uuid NOT NULL, "purchase_order_line_id" uuid NOT NULL, "article_id" uuid NOT NULL, "expected_quantity" numeric(10,2) NOT NULL, "received_quantity" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."receptions_status_enum" NOT NULL DEFAULT 'pending', "received_at" TIMESTAMP WITH TIME ZONE, "received_by" uuid, "notes" text, CONSTRAINT "PK_79571c06adcaae247f61366a240" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."attachments_status_enum" AS ENUM('draft', 'confirmed', 'invoiced')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."attachments_attachment_type_enum" AS ENUM('external', 'internal')`,
    );
    await queryRunner.query(
      `CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "project_id" uuid NOT NULL, "subcontractor_id" uuid, "title" character varying(255) NOT NULL, "status" "public"."attachments_status_enum" NOT NULL DEFAULT 'draft', "attachment_type" "public"."attachments_attachment_type_enum" NOT NULL DEFAULT 'external', "personnel_cost" numeric(15,2) NOT NULL DEFAULT '0', "articles_cost" numeric(15,2) NOT NULL DEFAULT '0', "tools_cost" numeric(15,2) NOT NULL DEFAULT '0', "total_cost" numeric(15,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL DEFAULT 'MAD', "confirmed_at" TIMESTAMP WITH TIME ZONE, "confirmed_by" uuid, "created_by" uuid NOT NULL, CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "attachment_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attachment_id" uuid NOT NULL, "task_id" uuid NOT NULL, CONSTRAINT "PK_fb4c451b5cdbd3db86e382faddb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum" AS ENUM('pending_validation', 'validated', 'paid')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "invoice_number" character varying(20) NOT NULL, "attachment_id" uuid NOT NULL, "subcontractor_id" uuid NOT NULL, "project_id" uuid NOT NULL, "amount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'pending_validation', "pdf_url" text, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "validated_at" TIMESTAMP WITH TIME ZONE, "paid_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_d8f8d3788694e1b3f96c42c36fb" UNIQUE ("invoice_number"), CONSTRAINT "UQ_a0a4e2272267bb41e55d359265e" UNIQUE ("attachment_id"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."non_conformities_status_enum" AS ENUM('open', 'in_review', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "non_conformities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "project_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "status" "public"."non_conformities_status_enum" NOT NULL DEFAULT 'open', "plan_id" uuid, "plan_url" text, "marker_x" numeric(8,4), "marker_y" numeric(8,4), "severity" character varying(20) DEFAULT 'medium', "location" character varying(255), "deadline" date, "reported_by" uuid NOT NULL, CONSTRAINT "PK_c89f2bca8b5acb75b63b9917ec4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "nc_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nc_id" uuid NOT NULL, "image_url" text NOT NULL, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_479d2d22a05d4b5869512fe53ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."documents_source_type_enum" AS ENUM('project', 'task', 'contact', 'nc', 'attachment', 'invoice', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "source_type" "public"."documents_source_type_enum" NOT NULL, "source_id" uuid NOT NULL, "document_name" character varying(255) NOT NULL, "file_url" text NOT NULL, "file_type" character varying(50) NOT NULL, "file_size" bigint NOT NULL, "uploaded_by" uuid NOT NULL, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "description" text, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tutorials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(255) NOT NULL, "category" character varying(100) NOT NULL, "content" text NOT NULL, "video_url" text, "order_index" integer NOT NULL DEFAULT '0', "published" boolean NOT NULL DEFAULT false, "created_by" uuid NOT NULL, CONSTRAINT "PK_e9152ab79d78c6a5e4c7bd47f61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "support_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "subject" character varying(255) NOT NULL, "description" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'open', "priority" character varying(10) NOT NULL DEFAULT 'medium', CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ticket_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ticket_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "message" text NOT NULL, "is_support_agent" boolean NOT NULL DEFAULT false, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_37beb692dedf7eccb4e519ccec1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_billing_type_enum" AS ENUM('monthly', 'annually', 'yearly')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_plan_enum" AS ENUM('starter', 'basic', 'business', 'enterprise')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_payment_method_enum" AS ENUM('credit_card', 'bank_transfer', 'paypal', 'check')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('pending', 'active', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "company_name" character varying(255) NOT NULL, "billing_type" "public"."subscriptions_billing_type_enum" NOT NULL, "plan" "public"."subscriptions_plan_enum" NOT NULL DEFAULT 'starter', "price" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "billing_start_date" date NOT NULL, "next_billing_date" date NOT NULL, "payment_method" "public"."subscriptions_payment_method_enum" NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'pending', "access_restricted" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_f6ac03431c311ccb8bbd7d3af18" UNIQUE ("tenant_id"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_payments_payment_method_enum" AS ENUM('credit_card', 'bank_transfer', 'paypal', 'check')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'paid', 'partially_paid', 'overdue')`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "project_id" uuid, "invoice_number" character varying(100) NOT NULL, "invoice_file_url" text, "amount" numeric(15,2) NOT NULL, "amount_paid" numeric(15,2) NOT NULL DEFAULT '0', "remaining_amount" numeric(15,2) NOT NULL DEFAULT '0', "due_date" date NOT NULL, "payment_method" "public"."supplier_payments_payment_method_enum", "status" "public"."supplier_payments_status_enum" NOT NULL DEFAULT 'pending', "currency" character varying(3) NOT NULL DEFAULT 'MAD', "notes" text, CONSTRAINT "PK_76e86f3194494faf999c652dbf9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subcontractor_payments_payment_method_enum" AS ENUM('credit_card', 'bank_transfer', 'paypal', 'check')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subcontractor_payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'paid', 'partially_paid', 'overdue')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subcontractor_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "subcontractor_id" uuid NOT NULL, "project_id" uuid NOT NULL, "task_id" uuid, "invoice_id" uuid, "contract_amount" numeric(15,2) NOT NULL, "amount_paid" numeric(15,2) NOT NULL DEFAULT '0', "remaining_amount" numeric(15,2) NOT NULL DEFAULT '0', "payment_date" date, "payment_method" "public"."subcontractor_payments_payment_method_enum", "status" "public"."subcontractor_payments_status_enum" NOT NULL DEFAULT 'pending', "currency" character varying(3) NOT NULL DEFAULT 'MAD', "notes" text, CONSTRAINT "PK_839bd10f335d3c85936e7fe1575" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_payment_type_enum" AS ENUM('income', 'expense', 'subscription', 'supplier_payment', 'subcontractor_payment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_payment_method_enum" AS ENUM('credit_card', 'bank_transfer', 'paypal', 'check')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'confirmed', 'success', 'failed', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "transaction_id" character varying(100) NOT NULL, "tenant_id" uuid NOT NULL, "payment_type" "public"."transactions_payment_type_enum" NOT NULL, "source_id" uuid NOT NULL, "project_id" uuid, "beneficiary_name" character varying(255) NOT NULL, "amount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'MAD', "payment_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "payment_method" "public"."transactions_payment_method_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "transaction_reference" character varying(200), "gateway_response" jsonb, CONSTRAINT "UQ_9162bf9ab4e31961a8f7932974c" UNIQUE ("transaction_id"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operateurs_type_contrat_enum" AS ENUM('cdd', 'journalier')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."operateurs_statut_enum" AS ENUM('actif', 'inactif', 'archive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operateurs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "nom_complet" character varying(255) NOT NULL, "cin" character varying(20), "telephone" character varying(30), "type_contrat" "public"."operateurs_type_contrat_enum" NOT NULL DEFAULT 'cdd', "taux_journalier" numeric(10,2), "currency" character varying(3) NOT NULL DEFAULT 'MAD', "statut" "public"."operateurs_statut_enum" NOT NULL DEFAULT 'actif', "projet_actuel_id" uuid, CONSTRAINT "PK_ee1c35a2e01b4bd7a0e4589ec9c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pointages_journaliers_statut_presence_enum" AS ENUM('present', 'absent', 'retard', 'demi_journee')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pointages_journaliers_type_contrat_enum" AS ENUM('cdd', 'journalier')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pointages_journaliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "operateur_id" uuid NOT NULL, "projet_id" uuid NOT NULL, "tache_id" uuid, "date_pointage" date NOT NULL, "heure_debut" character varying(5), "heure_fin" character varying(5), "heures_travaillees" numeric(4,2) NOT NULL DEFAULT '0', "statut_presence" "public"."pointages_journaliers_statut_presence_enum" NOT NULL, "type_contrat" "public"."pointages_journaliers_type_contrat_enum" NOT NULL DEFAULT 'cdd', "commentaire" text, "is_valide" boolean NOT NULL DEFAULT false, "valide_par" uuid, "valide_le" TIMESTAMP WITH TIME ZONE, "saisi_par" uuid NOT NULL, CONSTRAINT "PK_718449acd50c77145b363d847df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plans_categorie_enum" AS ENUM('architectural', 'structural', 'electrical', 'plumbing', 'general', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."plans_statut_enum" AS ENUM('actif', 'archive', 'brouillon')`,
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "projet_id" uuid NOT NULL, "nom" character varying(255) NOT NULL, "reference" character varying(100), "description" text, "categorie" "public"."plans_categorie_enum" NOT NULL DEFAULT 'general', "version_actuelle" integer NOT NULL DEFAULT '1', "file_url" text NOT NULL, "file_type" character varying(10) NOT NULL, "largeur_px" integer, "hauteur_px" integer, "statut" "public"."plans_statut_enum" NOT NULL DEFAULT 'actif', "uploaded_by" uuid NOT NULL, CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "plan_id" uuid NOT NULL, "numero_version" integer NOT NULL, "file_url" text NOT NULL, "file_type" character varying(10) NOT NULL, "commentaire_version" text, "uploaded_by" uuid NOT NULL, CONSTRAINT "PK_dd2f605d45f2679a86a7c1c5b20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'project_manager', 'site_manager', 'accountant', 'viewer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."project_status" RENAME TO "project_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('planned', 'on_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."projects_status_enum" USING "status"::"text"::"public"."projects_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'planned'`,
    );
    await queryRunner.query(`DROP TYPE "public"."project_status_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."task_status" RENAME TO "task_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('planned', 'on_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_tasks_update_project ON tasks`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."tasks_status_enum" USING "status"::"text"::"public"."tasks_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TRIGGER trg_tasks_update_project AFTER INSERT OR UPDATE OF status, progress ON tasks FOR EACH ROW EXECUTE FUNCTION fn_update_project_from_tasks()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'planned'`,
    );
    await queryRunner.query(`DROP TYPE "public"."task_status_old"`);
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ALTER COLUMN "total_cost" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_finance_snapshots" ADD CONSTRAINT "FK_df9b754e4878de6a7ce7dcafe1a" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "FK_e0d8dce5f9acc0862d2f5436d94" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "FK_7b317eeabbe32e6167a20572f04" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_articles" ADD CONSTRAINT "FK_5da4466f47fec5bd2a54b7331e7" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_articles" ADD CONSTRAINT "FK_9cc83dcdad50d492a0eb6adc23b" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_tools" ADD CONSTRAINT "FK_0b1561751a0d530a5a6e206ab9e" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_tools" ADD CONSTRAINT "FK_88410be425742a2a6dd3bae08e9" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_movements" ADD CONSTRAINT "FK_c3a9882c76009cfbf92ac3cbb7d" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_documents" ADD CONSTRAINT "FK_ad3d8b43401c42c967e963d6fd7" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_c70f4952f88b5bd649151f631c8" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachment_tasks" ADD CONSTRAINT "FK_02d5b85b3d8a898536713438066" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nc_images" ADD CONSTRAINT "FK_8814311a2cb334051a622749c1a" FOREIGN KEY ("nc_id") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" ADD CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_versions" ADD CONSTRAINT "FK_b504a5b710ec5832245809b7bce" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_versions" DROP CONSTRAINT "FK_b504a5b710ec5832245809b7bce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" DROP CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nc_images" DROP CONSTRAINT "FK_8814311a2cb334051a622749c1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachment_tasks" DROP CONSTRAINT "FK_02d5b85b3d8a898536713438066"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" DROP CONSTRAINT "FK_c70f4952f88b5bd649151f631c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_documents" DROP CONSTRAINT "FK_ad3d8b43401c42c967e963d6fd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_movements" DROP CONSTRAINT "FK_c3a9882c76009cfbf92ac3cbb7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_tools" DROP CONSTRAINT "FK_88410be425742a2a6dd3bae08e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_tools" DROP CONSTRAINT "FK_0b1561751a0d530a5a6e206ab9e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_articles" DROP CONSTRAINT "FK_9cc83dcdad50d492a0eb6adc23b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_articles" DROP CONSTRAINT "FK_5da4466f47fec5bd2a54b7331e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "FK_7b317eeabbe32e6167a20572f04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" DROP CONSTRAINT "FK_e0d8dce5f9acc0862d2f5436d94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_finance_snapshots" DROP CONSTRAINT "FK_df9b754e4878de6a7ce7dcafe1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ALTER COLUMN "total_cost" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."task_status_old" AS ENUM('planned', 'on_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."task_status_old" USING "status"::"text"::"public"."task_status_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'planned'`,
    );
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."task_status_old" RENAME TO "task_status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_old" AS ENUM('planned', 'on_progress', 'completed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."project_status_old" USING "status"::"text"::"public"."project_status_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'planned'`,
    );
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."project_status_old" RENAME TO "project_status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_old" AS ENUM('admin', 'project_manager', 'site_manager', 'accountant', 'viewer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role_old" USING "role"::"text"::"public"."user_role_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_old" RENAME TO "user_role"`,
    );
    await queryRunner.query(`DROP TABLE "plan_versions"`);
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TYPE "public"."plans_statut_enum"`);
    await queryRunner.query(`DROP TYPE "public"."plans_categorie_enum"`);
    await queryRunner.query(`DROP TABLE "pointages_journaliers"`);
    await queryRunner.query(
      `DROP TYPE "public"."pointages_journaliers_type_contrat_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."pointages_journaliers_statut_presence_enum"`,
    );
    await queryRunner.query(`DROP TABLE "operateurs"`);
    await queryRunner.query(`DROP TYPE "public"."operateurs_statut_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."operateurs_type_contrat_enum"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."transactions_payment_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transactions_payment_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "subcontractor_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."subcontractor_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subcontractor_payments_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."supplier_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."supplier_payments_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscriptions_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscriptions_billing_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "ticket_messages"`);
    await queryRunner.query(`DROP TABLE "support_tickets"`);
    await queryRunner.query(`DROP TABLE "tutorials"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "public"."documents_source_type_enum"`);
    await queryRunner.query(`DROP TABLE "nc_images"`);
    await queryRunner.query(`DROP TABLE "non_conformities"`);
    await queryRunner.query(
      `DROP TYPE "public"."non_conformities_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TABLE "attachment_tasks"`);
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(
      `DROP TYPE "public"."attachments_attachment_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."attachments_status_enum"`);
    await queryRunner.query(`DROP TABLE "receptions"`);
    await queryRunner.query(`DROP TYPE "public"."receptions_status_enum"`);
    await queryRunner.query(`DROP TABLE "purchase_order_lines"`);
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "public"."purchase_orders_status_enum"`);
    await queryRunner.query(`DROP TABLE "contact_documents"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TYPE "public"."contacts_contact_type_enum"`);
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(
      `DROP TYPE "public"."stock_movements_movement_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "tool_movements"`);
    await queryRunner.query(`DROP TABLE "task_tools"`);
    await queryRunner.query(`DROP TABLE "tools"`);
    await queryRunner.query(`DROP TYPE "public"."tools_status_enum"`);
    await queryRunner.query(`DROP TABLE "task_articles"`);
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(
      `ALTER TABLE "personnel" ADD CONSTRAINT "personnel_tenant_id_email_key" UNIQUE ("tenant_id", "email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_email_key" UNIQUE ("tenant_id", "email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "task_personnel_unit_cost_check" CHECK ((unit_cost >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "task_personnel_quantity_check" CHECK ((quantity > (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_progress_check" CHECK (((progress >= (0)::numeric) AND (progress <= (100)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_check" CHECK ((end_date >= start_date))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_progress_check" CHECK (((progress >= (0)::numeric) AND (progress <= (100)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_check" CHECK ((end_date > start_date))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_budget_check" CHECK ((budget > (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "personnel" ADD CONSTRAINT "personnel_cost_per_hour_check" CHECK ((cost_per_hour >= (0)::numeric))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_task_personnel_task" ON "task_personnel" ("task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_tenant" ON "tasks" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_project_status" ON "tasks" ("project_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_projects_tenant_status" ON "projects" ("status", "tenant_id") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_personnel_tenant" ON "personnel" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_tenant" ON "users" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "task_personnel_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_personnel" ADD CONSTRAINT "task_personnel_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_finance_snapshots" ADD CONSTRAINT "project_finance_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "personnel" ADD CONSTRAINT "personnel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
