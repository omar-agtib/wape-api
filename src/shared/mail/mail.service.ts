import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;
  private readonly fromName: string;
  private readonly fromAddress: string;

  // Compiled template cache (compiled once, reused)
  private layout!: Handlebars.TemplateDelegate;
  private readonly templates = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templatesDir = join(__dirname, 'templates');

  constructor(private readonly config: ConfigService) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4000';
    this.fromName =
      this.config.get<string>('MAIL_FROM_NAME') ?? 'WAPE Platform';
    this.fromAddress =
      this.config.get<string>('MAIL_FROM_ADDRESS') ?? 'noreply@wape.ma';
  }

  onModuleInit(): void {
    // Set the SendGrid API key once at startup
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY is not set — emails will not send.');
    }

    // Compile the base layout once
    try {
      const layoutSrc = readFileSync(
        join(this.templatesDir, 'base.layout.hbs'),
        'utf8',
      );
      this.layout = Handlebars.compile(layoutSrc);
    } catch (err) {
      this.logger.error(
        `Could not load base.layout.hbs from ${this.templatesDir}: ${(err as Error).message}`,
      );
    }
  }

  // ── Core send method ────────────────────────────────────────────────────────

  async send(options: SendMailOptions): Promise<void> {
    const baseContext = {
      frontendUrl: this.frontendUrl,
      year: new Date().getFullYear(),
      subject: options.subject,
    };
    const context = { ...baseContext, ...options.context };

    try {
      const html = this.render(options.template, context);

      await sgMail.send({
        to: options.to,
        from: { email: this.fromAddress, name: this.fromName },
        subject: `${options.subject} — WAPE`,
        html,
      });

      const recipients = Array.isArray(options.to)
        ? options.to.join(', ')
        : options.to;
      this.logger.log(`Email sent [${options.template}] → ${recipients}`);
    } catch (err) {
      // Non-fatal — log and continue, never crash the main flow
      const message = (err as { response?: { body?: unknown } })?.response?.body
        ? JSON.stringify((err as { response: { body: unknown } }).response.body)
        : (err as Error).message;
      this.logger.error(
        `Failed to send email [${options.template}]: ${message}`,
        (err as Error).stack,
      );
    }
  }

  // ── Template rendering (body injected into base layout) ──────────────────────

  private render(
    templateName: string,
    context: Record<string, unknown>,
  ): string {
    const bodyTemplate = this.getTemplate(templateName);
    const body = bodyTemplate(context);
    return this.layout({ ...context, body });
  }

  private getTemplate(name: string): Handlebars.TemplateDelegate {
    const cached = this.templates.get(name);
    if (cached) return cached;

    const src = readFileSync(join(this.templatesDir, `${name}.hbs`), 'utf8');
    const compiled = Handlebars.compile(src);
    this.templates.set(name, compiled);
    return compiled;
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
