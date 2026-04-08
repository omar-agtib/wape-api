import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

// ── Event payload types ────────────────────────────────────────────────────────

export interface FinanceUpdatedPayload {
  projectId: string;
  projectName: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentConsumed: number;
  alertLevel: 'normal' | 'warning' | 'critical';
  currency: string;
  breakdown: {
    personnel: number;
    articles: number;
    tools: number;
  };
}

export interface ProjectProgressPayload {
  projectId: string;
  projectName: string;
  progress: number;
  status: string;
}

export interface TaskStatusPayload {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  newStatus: string;
  progress: number;
  updatedBy: string;
}

export interface InvoiceCreatedPayload {
  invoiceId: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  subcontractorName: string;
  amount: number;
  currency: string;
  status: string;
}

export interface InvoiceUpdatedPayload {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  updatedAt: string;
}

export interface NcReportedPayload {
  ncId: string;
  ncTitle: string;
  projectId: string;
  projectName: string;
  reportedBy: string;
  status: string;
}

export interface BudgetAlertPayload {
  projectId: string;
  projectName: string;
  percentConsumed: number;
  alertLevel: 'warning' | 'critical';
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  currency: string;
}

export interface NotificationPayload {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  link?: string;
  entityId?: string;
}

export interface StockAlertPayload {
  articleId: string;
  articleName: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  taskId?: string;
  taskName?: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  // ── Finance ──────────────────────────────────────────────────────────────────

  emitFinanceUpdated(tenantId: string, payload: FinanceUpdatedPayload): void {
    this.gateway.emitToProject(
      tenantId,
      payload.projectId,
      'finance.updated',
      payload,
    );

    // If budget alert threshold crossed — also emit dedicated alert event
    if (payload.alertLevel !== 'normal') {
      this.emitBudgetAlert(tenantId, {
        projectId: payload.projectId,
        projectName: payload.projectName,
        percentConsumed: payload.percentConsumed,
        alertLevel: payload.alertLevel,
        totalBudget: payload.totalBudget,
        totalSpent: payload.totalSpent,
        remainingBudget: payload.remainingBudget,
        currency: payload.currency,
      });
    }

    this.logger.debug(
      `[emit] finance.updated → tenant:${tenantId} project:${payload.projectId} (${payload.percentConsumed}%)`,
    );
  }

  emitBudgetAlert(tenantId: string, payload: BudgetAlertPayload): void {
    this.gateway.emitToTenant(tenantId, 'budget.alert', payload);

    // Also send a notification bubble
    this.emitNotification(tenantId, {
      type: payload.alertLevel === 'critical' ? 'error' : 'warning',
      title:
        payload.alertLevel === 'critical'
          ? `🔴 Dépassement budgétaire — ${payload.projectName}`
          : `🟠 Alerte budget — ${payload.projectName}`,
      message: `${payload.percentConsumed}% du budget consommé`,
      link: `/projects/${payload.projectId}/finance`,
      entityId: payload.projectId,
    });
  }

  // ── Projects & Tasks ──────────────────────────────────────────────────────────

  emitProjectProgress(tenantId: string, payload: ProjectProgressPayload): void {
    this.gateway.emitToProject(
      tenantId,
      payload.projectId,
      'project.progress',
      payload,
    );
    this.logger.debug(
      `[emit] project.progress → ${payload.projectId} (${payload.progress}% / ${payload.status})`,
    );
  }

  emitTaskStatus(tenantId: string, payload: TaskStatusPayload): void {
    this.gateway.emitToProject(
      tenantId,
      payload.projectId,
      'task.status',
      payload,
    );

    // Notification for completed tasks
    if (payload.newStatus === 'completed') {
      this.emitNotification(tenantId, {
        type: 'success',
        title: `✅ Tâche terminée`,
        message: `"${payload.taskName}" marquée comme terminée sur ${payload.projectName}`,
        link: `/projects/${payload.projectId}`,
        entityId: payload.taskId,
      });
    }
  }

  // ── Invoices ──────────────────────────────────────────────────────────────────

  emitInvoiceCreated(tenantId: string, payload: InvoiceCreatedPayload): void {
    this.gateway.emitToTenant(tenantId, 'invoice.created', payload);
    this.emitNotification(tenantId, {
      type: 'info',
      title: `🧾 Facture créée — ${payload.invoiceNumber}`,
      message: `${payload.amount.toLocaleString()} ${payload.currency} · ${payload.subcontractorName}`,
      link: `/invoices/${payload.invoiceId}`,
      entityId: payload.invoiceId,
    });
    this.logger.debug(`[emit] invoice.created → ${payload.invoiceNumber}`);
  }

  emitInvoiceUpdated(tenantId: string, payload: InvoiceUpdatedPayload): void {
    this.gateway.emitToTenant(tenantId, 'invoice.updated', payload);

    const titles: Record<string, string> = {
      validated: `✅ Facture validée — ${payload.invoiceNumber}`,
      paid: `💰 Facture payée — ${payload.invoiceNumber}`,
    };

    if (titles[payload.status]) {
      this.emitNotification(tenantId, {
        type: 'success',
        title: titles[payload.status],
        message: `Statut mis à jour : ${payload.status}`,
        link: `/invoices/${payload.invoiceId}`,
        entityId: payload.invoiceId,
      });
    }
  }

  // ── Non-Conformities ──────────────────────────────────────────────────────────

  emitNcReported(tenantId: string, payload: NcReportedPayload): void {
    this.gateway.emitToProject(
      tenantId,
      payload.projectId,
      'nc.reported',
      payload,
    );
    this.emitNotification(tenantId, {
      type: 'warning',
      title: `🚨 Non-conformité signalée`,
      message: `"${payload.ncTitle}" sur ${payload.projectName}`,
      link: `/non-conformities/${payload.ncId}`,
      entityId: payload.ncId,
    });
    this.logger.debug(`[emit] nc.reported → ${payload.ncId}`);
  }

  // ── Stock ─────────────────────────────────────────────────────────────────────

  emitStockAlert(tenantId: string, payload: StockAlertPayload): void {
    this.gateway.emitToTenant(tenantId, 'stock.alert', payload);
    this.emitNotification(tenantId, {
      type: 'warning',
      title: `📦 Stock réservé — ${payload.articleName}`,
      message: `Disponible : ${payload.availableQuantity} unités`,
      link: `/articles/${payload.articleId}`,
      entityId: payload.articleId,
    });
  }

  // ── Generic notification ──────────────────────────────────────────────────────

  emitNotification(tenantId: string, payload: NotificationPayload): void {
    this.gateway.emitToTenant(tenantId, 'notification', payload);
  }

  // ── Admin stats ───────────────────────────────────────────────────────────────

  getConnectionCount(tenantId: string): number {
    return this.gateway.getConnectionCount(tenantId);
  }
}
