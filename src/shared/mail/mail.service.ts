import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;
  private readonly fromName: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4000';
    this.fromName =
      this.config.get<string>('MAIL_FROM_NAME') ?? 'WAPE Platform';
  }

  // ── Core send method ────────────────────────────────────────────────────────

  async send(options: SendMailOptions): Promise<void> {
    const baseContext = {
      frontendUrl: this.frontendUrl,
      year: new Date().getFullYear(),
      subject: options.subject,
    };

    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: `${options.subject} — WAPE`,
        template: options.template,
        context: { ...baseContext, ...options.context },
      });

      const recipients = Array.isArray(options.to)
        ? options.to.join(', ')
        : options.to;
      this.logger.log(`Email sent [${options.template}] → ${recipients}`);
    } catch (err) {
      // Non-fatal — log and continue, never crash the main flow
      this.logger.error(
        `Failed to send email [${options.template}]: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // ── Welcome ─────────────────────────────────────────────────────────────────

  async sendWelcome(
    to: string,
    data: {
      fullName: string;
      companyName: string;
      email: string;
      slug: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Bienvenue sur WAPE — ${data.companyName}`,
      template: 'welcome',
      context: data,
    });
  }

  // ── Subscription ─────────────────────────────────────────────────────────────

  async sendSubscriptionExpiring(
    to: string,
    data: {
      companyName: string;
      plan: string;
      billingType: string;
      amount: number;
      currency: string;
      nextBillingDate: string;
      daysLeft: number;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Votre abonnement WAPE expire dans ${data.daysLeft} jour(s)`,
      template: 'subscription-expiring',
      context: data,
    });
  }

  async sendSubscriptionExpired(
    to: string,
    data: {
      companyName: string;
      expiredDate: string;
      daysUntilRestriction: number;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: 'Votre abonnement WAPE a expiré',
      template: 'subscription-expired',
      context: data,
    });
  }

  async sendAccessRestricted(
    to: string,
    data: {
      companyName: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: 'Accès WAPE suspendu — Renouvelez votre abonnement',
      template: 'subscription-access-restricted',
      context: data,
    });
  }

  async sendPaymentConfirmed(
    to: string,
    data: {
      companyName: string;
      transactionId: string;
      plan: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      paymentDate: string;
      nextBillingDate: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Paiement WAPE confirmé — ${data.transactionId}`,
      template: 'subscription-payment-confirmed',
      context: data,
    });
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────

  async sendInvoiceCreated(
    to: string | string[],
    data: {
      invoiceNumber: string;
      invoiceId: string;
      subcontractorName: string;
      projectName: string;
      amount: number;
      currency: string;
      issuedAt: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Nouvelle facture ${data.invoiceNumber} — ${data.projectName}`,
      template: 'invoice-created',
      context: data,
    });
  }

  async sendInvoiceValidated(
    to: string | string[],
    data: {
      invoiceNumber: string;
      invoiceId: string;
      subcontractorName: string;
      amount: number;
      currency: string;
      validatedAt: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Facture validée — ${data.invoiceNumber}`,
      template: 'invoice-validated',
      context: data,
    });
  }

  async sendInvoicePaid(
    to: string | string[],
    data: {
      invoiceNumber: string;
      invoiceId: string;
      subcontractorName: string;
      amount: number;
      currency: string;
      paidAt: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Facture payée — ${data.invoiceNumber}`,
      template: 'invoice-paid',
      context: data,
    });
  }

  // ── Supplier Payments ────────────────────────────────────────────────────────

  async sendSupplierPaymentOverdue(
    to: string | string[],
    data: {
      supplierName: string;
      invoiceNumber: string;
      amount: number;
      amountPaid: number;
      remainingAmount: number;
      currency: string;
      dueDate: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `⚠️ Paiement en retard — ${data.supplierName}`,
      template: 'supplier-payment-overdue',
      context: data,
    });
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────

  async sendTaskStatusChanged(
    to: string | string[],
    data: {
      taskName: string;
      projectName: string;
      projectId: string;
      newStatus: string;
      updatedAt: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Tâche mise à jour — ${data.taskName}`,
      template: 'task-status-changed',
      context: {
        ...data,
        isCompleted: data.newStatus === 'completed',
        isOnProgress: data.newStatus === 'on_progress',
        isPlanned: data.newStatus === 'planned',
      },
    });
  }

  // ── Non-Conformities ─────────────────────────────────────────────────────────

  async sendNcReported(
    to: string | string[],
    data: {
      ncId: string;
      ncTitle: string;
      projectName: string;
      description: string;
      reportedBy: string;
      reportedAt: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `🚨 Non-conformité signalée — ${data.projectName}`,
      template: 'nc-reported',
      context: data,
    });
  }

  // ── Budget Alerts ────────────────────────────────────────────────────────────

  async sendBudgetAlert(
    to: string | string[],
    data: {
      projectId: string;
      projectName: string;
      totalBudget: number;
      totalSpent: number;
      remainingBudget: number;
      percentConsumed: number;
      currency: string;
      alertLevel: 'warning' | 'critical';
    },
  ): Promise<void> {
    const emoji = data.alertLevel === 'critical' ? '🔴' : '🟠';
    await this.send({
      to,
      subject: `${emoji} Alerte budget ${data.percentConsumed}% — ${data.projectName}`,
      template: 'budget-alert',
      context: {
        ...data,
        isCritical: data.alertLevel === 'critical',
        isWarning: data.alertLevel === 'warning',
      },
    });
  }

  // ── Support ──────────────────────────────────────────────────────────────────

  async sendTicketReply(
    to: string,
    data: {
      userName: string;
      subject: string;
      ticketId: string;
      agentMessage: string;
    },
  ): Promise<void> {
    await this.send({
      to,
      subject: `Réponse à votre ticket — ${data.subject}`,
      template: 'support-ticket-reply',
      context: data,
    });
  }
}
