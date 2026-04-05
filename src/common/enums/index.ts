export enum ProjectStatus {
  PLANNED = 'planned',
  ON_PROGRESS = 'on_progress',
  COMPLETED = 'completed',
}

export enum TaskStatus {
  PLANNED = 'planned',
  ON_PROGRESS = 'on_progress',
  COMPLETED = 'completed',
}

export enum ToolStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum StockMovementType {
  RESERVED = 'reserved',
  CONSUMED = 'consumed',
  INCOMING = 'incoming',
}

export enum ContactType {
  SUPPLIER = 'supplier',
  CLIENT = 'client',
  SUBCONTRACTOR = 'subcontractor',
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
}

export enum ReceptionStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
}

export enum AttachmentStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  INVOICED = 'invoiced',
}

export enum AttachmentType {
  EXTERNAL = 'external',
  INTERNAL = 'internal',
}

export enum InvoiceStatus {
  PENDING_VALIDATION = 'pending_validation',
  VALIDATED = 'validated',
  PAID = 'paid',
}

export enum NcStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  CLOSED = 'closed',
}

export enum DocSourceType {
  PROJECT = 'project',
  TASK = 'task',
  CONTACT = 'contact',
  NC = 'nc',
  ATTACHMENT = 'attachment',
  INVOICE = 'invoice',
  OTHER = 'other',
}

export enum UserRole {
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  SITE_MANAGER = 'site_manager',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

export const SUPPORTED_CURRENCIES = ['MAD', 'USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export enum BillingType {
  MONTHLY = 'monthly',
  ANNUALLY = 'annually',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  BASIC = 'basic',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  CHECK = 'check',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  SUBSCRIPTION = 'subscription',
  SUPPLIER = 'supplier_payment',
  SUBCONTRACTOR = 'subcontractor_payment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SUCCESS = 'success',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}
