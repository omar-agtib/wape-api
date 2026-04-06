import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Subscription } from './entities/subscription.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SubcontractorPayment } from './entities/subcontractor-payment.entity';
import { Transaction } from './entities/transaction.entity';
import { ContactsService } from '../contacts/contacts.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PaySupplierDto } from './dto/pay-supplier.dto';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { PaySubcontractorDto } from './dto/pay-subcontractor.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { ValidateTransactionDto } from './dto/validate-transaction.dto';
import {
  BillingType,
  ContactType,
  PaymentMethodType,
  PaymentStatus,
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
  UserRole,
} from '../../common/enums';
import {
  paginate,
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(SupplierPayment)
    private readonly spRepo: Repository<SupplierPayment>,
    @InjectRepository(SubcontractorPayment)
    private readonly scpRepo: Repository<SubcontractorPayment>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly contactsService: ContactsService,
  ) {}

  // ── Subscriptions ──────────────────────────────────────────────────────────

  async createSubscription(
    tenantId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    // RG-P02 — one active subscription per tenant
    const existing = await this.subRepo.findOne({ where: { tenantId } });
    if (existing) {
      throw new ConflictException({
        error: 'SUBSCRIPTION_ALREADY_EXISTS',
        message: `This tenant already has a subscription (status: ${existing.status}). Only one subscription allowed per tenant (RG-P02).`,
        details: {
          existingSubscriptionId: existing.id,
          existingStatus: existing.status,
        },
      });
    }
    const nextBillingDate = this.calcNextBillingDate(
      dto.billingStartDate,
      dto.billingType,
    );

    const subscription = this.subRepo.create({
      tenantId,
      companyName: dto.companyName,
      billingType: dto.billingType,
      plan: dto.plan,
      price: dto.price,
      currency: dto.currency,
      billingStartDate: dto.billingStartDate,
      nextBillingDate,
      paymentMethod: dto.paymentMethod,
      status: SubscriptionStatus.PENDING,
      accessRestricted: false,
    });

    return this.subRepo.save(subscription);
  }

  async getSubscription(tenantId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { tenantId } });
    if (!sub) {
      throw new NotFoundException({
        error: 'SUBSCRIPTION_NOT_FOUND',
        message: 'No subscription found for this tenant',
      });
    }
    return sub;
  }

  // ── W11: Webhook payment confirmed (CB/PayPal/CMI) ─────────────────────────
  async processWebhook(
    tenantId: string,
    gatewayTransactionId: string,
    gatewayResponse: object,
  ): Promise<{ transaction: Transaction; subscription: Subscription }> {
    const subscription = await this.getSubscription(tenantId);

    // Create transaction record
    const tx = await this.createTransaction({
      transactionId: gatewayTransactionId,
      tenantId,
      paymentType: TransactionType.SUBSCRIPTION,
      sourceId: subscription.id,
      beneficiaryName: subscription.companyName,
      amount: subscription.price,
      currency: subscription.currency,
      paymentMethod: subscription.paymentMethod,
      status: TransactionStatus.SUCCESS,
      gatewayResponse,
    });

    // Update subscription
    const nextBillingDate = this.calcNextBillingDate(
      new Date().toISOString().slice(0, 10),
      subscription.billingType,
    );

    await this.subRepo.update(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate,
      accessRestricted: false,
    });

    const updated = await this.getSubscription(tenantId);
    this.logger.log(
      `Subscription payment confirmed for tenant ${tenantId} — ${tx.transactionId}`,
    );

    return { transaction: tx, subscription: updated };
  }

  // ── W12: Manual bank transfer validation ────────────────────────────────────
  async validateBankTransfer(
    tenantId: string,
    transactionId: string,
    dto: ValidateTransactionDto,
    userRole: UserRole,
  ): Promise<Transaction> {
    // RG-P04 — only admin or accountant
    if (![UserRole.ADMIN, UserRole.ACCOUNTANT].includes(userRole)) {
      throw new ForbiddenException({
        error: 'INSUFFICIENT_PERMISSIONS',
        message:
          'Only Admin or Accountant can validate bank transfers (RG-P04)',
      });
    }

    const tx = await this.txRepo.findOne({
      where: { id: transactionId, tenantId },
    });
    if (!tx) {
      throw new NotFoundException({
        error: 'TRANSACTION_NOT_FOUND',
        message: `Transaction '${transactionId}' not found`,
      });
    }

    if (tx.status !== TransactionStatus.PENDING) {
      throw new UnprocessableEntityException({
        error: 'TRANSACTION_NOT_PENDING',
        message: `Transaction is already ${tx.status} and cannot be validated`,
      });
    }

    // RG-P03 — transactions are immutable — we create a new SUCCESS transaction
    // and mark the pending one as success via a compensatory approach
    await this.txRepo.update(tx.id, {
      status: TransactionStatus.SUCCESS,
      gatewayResponse: {
        ...((tx.gatewayResponse as object) ?? {}),
        validatedManually: true,
        validationNotes: dto.notes,
        validatedAt: new Date().toISOString(),
      },
    });

    // If it was a subscription payment, activate the subscription
    if (tx.paymentType === TransactionType.SUBSCRIPTION) {
      const subscription = await this.subRepo.findOne({
        where: { id: tx.sourceId },
      });
      if (subscription) {
        const nextBillingDate = this.calcNextBillingDate(
          new Date().toISOString().slice(0, 10),
          subscription.billingType,
        );
        await this.subRepo.update(subscription.id, {
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate,
          accessRestricted: false,
        });
      }
    }

    return this.txRepo.findOne({
      where: { id: transactionId },
    }) as Promise<Transaction>;
  }

  // ── Supplier Payments ───────────────────────────────────────────────────────

  async createSupplierPayment(
    tenantId: string,
    dto: CreateSupplierPaymentDto,
  ): Promise<SupplierPayment> {
    await this.contactsService.verifyType(
      tenantId,
      dto.supplierId,
      ContactType.SUPPLIER,
    );

    const payment = this.spRepo.create({
      ...dto,
      tenantId,
      amountPaid: 0,
      remainingAmount: dto.amount,
      status: PaymentStatus.PENDING,
    });

    return this.spRepo.save(payment);
  }

  async findAllSupplierPayments(
    tenantId: string,
    pagination: PaginationDto,
    filters: {
      supplierId?: string;
      projectId?: string;
      status?: PaymentStatus;
    },
  ): Promise<PaginatedResult<SupplierPayment>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.spRepo
      .createQueryBuilder('sp')
      .where('sp.tenant_id = :tenantId', { tenantId });

    if (filters.supplierId)
      qb.andWhere('sp.supplier_id = :sid', { sid: filters.supplierId });
    if (filters.projectId)
      qb.andWhere('sp.project_id = :pid', { pid: filters.projectId });
    if (filters.status)
      qb.andWhere('sp.status = :status', { status: filters.status });

    qb.orderBy('sp.due_date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  // ── W13: Record supplier payment (partial or full) ──────────────────────────
  async paySupplier(
    tenantId: string,
    paymentId: string,
    dto: PaySupplierDto,
  ): Promise<{
    supplierPayment: SupplierPayment;
    transaction: Transaction;
  }> {
    const payment = await this.spRepo.findOne({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        error: 'SUPPLIER_PAYMENT_NOT_FOUND',
        message: `Payment '${paymentId}' not found`,
      });
    }

    // RG-P01 — amount <= remaining
    if (dto.amount > payment.remainingAmount) {
      throw new UnprocessableEntityException({
        error: 'AMOUNT_EXCEEDS_REMAINING',
        message: `Cannot pay ${dto.amount} — only ${payment.remainingAmount} remaining (RG-P01)`,
        field: 'amount',
        details: {
          requested: dto.amount,
          remaining: payment.remainingAmount,
          total: payment.amount,
        },
      });
    }

    // RG-P05 — supplier payment cannot exceed invoice amount
    if (payment.amountPaid + dto.amount > payment.amount) {
      throw new UnprocessableEntityException({
        error: 'AMOUNT_EXCEEDS_INVOICE',
        message:
          'Total payments would exceed the supplier invoice amount (RG-P05)',
        field: 'amount',
      });
    }

    const newAmountPaid = payment.amountPaid + dto.amount;
    const newRemaining = payment.amount - newAmountPaid;
    const newStatus =
      newRemaining <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    await this.spRepo.update(paymentId, {
      amountPaid: newAmountPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentMethod: dto.paymentMethod,
    });

    // Create immutable transaction record
    const tx = await this.createTransaction({
      transactionId:
        dto.transactionReference ?? `SP-${Date.now()}-${uuidv4().slice(0, 8)}`,
      tenantId,
      paymentType: TransactionType.SUPPLIER,
      sourceId: paymentId,
      projectId: payment.projectId,
      beneficiaryName: `Supplier Payment ${payment.invoiceNumber}`,
      amount: dto.amount,
      currency: payment.currency,
      paymentMethod: dto.paymentMethod,
      status: TransactionStatus.SUCCESS,
      transactionReference: dto.transactionReference,
    });

    const updated = (await this.spRepo.findOne({
      where: { id: paymentId },
    })) as SupplierPayment;
    return { supplierPayment: updated, transaction: tx };
  }

  async uploadSupplierInvoice(
    tenantId: string,
    paymentId: string,
    fileUrl: string,
  ): Promise<SupplierPayment> {
    const payment = await this.spRepo.findOne({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        error: 'SUPPLIER_PAYMENT_NOT_FOUND',
        message: `Payment '${paymentId}' not found`,
      });
    }
    await this.spRepo.update(paymentId, { invoiceFileUrl: fileUrl });
    return this.spRepo.findOne({
      where: { id: paymentId },
    }) as Promise<SupplierPayment>;
  }

  // ── Subcontractor Payments ──────────────────────────────────────────────────

  async createSubcontractorPayment(
    tenantId: string,
    dto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPayment> {
    await this.contactsService.verifyType(
      tenantId,
      dto.subcontractorId,
      ContactType.SUBCONTRACTOR,
    );

    const payment = this.scpRepo.create({
      ...dto,
      tenantId,
      amountPaid: 0,
      remainingAmount: dto.contractAmount,
      status: PaymentStatus.PENDING,
    });

    return this.scpRepo.save(payment);
  }

  async findAllSubcontractorPayments(
    tenantId: string,
    pagination: PaginationDto,
    filters: {
      subcontractorId?: string;
      projectId?: string;
      status?: PaymentStatus;
    },
  ): Promise<PaginatedResult<SubcontractorPayment>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.scpRepo
      .createQueryBuilder('scp')
      .where('scp.tenant_id = :tenantId', { tenantId });

    if (filters.subcontractorId)
      qb.andWhere('scp.subcontractor_id = :scid', {
        scid: filters.subcontractorId,
      });
    if (filters.projectId)
      qb.andWhere('scp.project_id = :pid', { pid: filters.projectId });
    if (filters.status)
      qb.andWhere('scp.status = :status', { status: filters.status });

    qb.orderBy('scp.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async paySubcontractor(
    tenantId: string,
    paymentId: string,
    dto: PaySubcontractorDto,
  ): Promise<{
    subcontractorPayment: SubcontractorPayment;
    transaction: Transaction;
  }> {
    const payment = await this.scpRepo.findOne({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        error: 'SUBCONTRACTOR_PAYMENT_NOT_FOUND',
        message: `Payment '${paymentId}' not found`,
      });
    }

    // RG-P01
    if (dto.amount > payment.remainingAmount) {
      throw new UnprocessableEntityException({
        error: 'AMOUNT_EXCEEDS_REMAINING',
        message: `Cannot pay ${dto.amount} — only ${payment.remainingAmount} remaining (RG-P01)`,
        field: 'amount',
        details: { requested: dto.amount, remaining: payment.remainingAmount },
      });
    }

    const newAmountPaid = payment.amountPaid + dto.amount;
    const newRemaining = payment.contractAmount - newAmountPaid;
    const newStatus =
      newRemaining <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    await this.scpRepo.update(paymentId, {
      amountPaid: newAmountPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date().toISOString().slice(0, 10),
    });

    const tx = await this.createTransaction({
      transactionId:
        dto.transactionReference ?? `SCP-${Date.now()}-${uuidv4().slice(0, 8)}`,
      tenantId,
      paymentType: TransactionType.SUBCONTRACTOR,
      sourceId: paymentId,
      projectId: payment.projectId,
      beneficiaryName: `Subcontractor Payment`,
      amount: dto.amount,
      currency: payment.currency,
      paymentMethod: dto.paymentMethod,
      status: TransactionStatus.SUCCESS,
      transactionReference: dto.transactionReference,
    });

    const updated = (await this.scpRepo.findOne({
      where: { id: paymentId },
    })) as SubcontractorPayment;
    return { subcontractorPayment: updated, transaction: tx };
  }

  // ── Transactions ────────────────────────────────────────────────────────────

  async findAllTransactions(
    tenantId: string,
    filters: TransactionFilterDto,
  ): Promise<PaginatedResult<Transaction>> {
    const { page = 1, limit = 20 } = filters;

    // RG-P08 — max 12 months of data per request
    if (filters.dateFrom && filters.dateTo) {
      const from = new Date(filters.dateFrom);
      const to = new Date(filters.dateTo);
      const diffMonths =
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth());
      if (diffMonths > 12) {
        throw new UnprocessableEntityException({
          error: 'DATE_RANGE_TOO_LARGE',
          message:
            'Transaction export is limited to 12 months of data per request (RG-P08)',
          field: 'dateTo',
        });
      }
    }

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.tenant_id = :tenantId', { tenantId });

    if (filters.paymentType)
      qb.andWhere('tx.payment_type = :type', { type: filters.paymentType });
    if (filters.status)
      qb.andWhere('tx.status = :status', { status: filters.status });
    if (filters.projectId)
      qb.andWhere('tx.project_id = :pid', { pid: filters.projectId });
    if (filters.dateFrom)
      qb.andWhere('tx.payment_date >= :from', { from: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere('tx.payment_date <= :to', { to: filters.dateTo });

    qb.orderBy('tx.payment_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  // ── Dashboard KPIs ──────────────────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const currentMonth = new Date();
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    ).toISOString();
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    ).toISOString();

    // Total payments this month (successful)
    const totalThisMonth = await this.txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.tenant_id = :tenantId', { tenantId })
      .andWhere('tx.status = :status', { status: TransactionStatus.SUCCESS })
      .andWhere('tx.payment_date >= :start AND tx.payment_date <= :end', {
        start: monthStart,
        end: monthEnd,
      })
      .getRawOne();

    // By type this month
    const byType = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.payment_type', 'type')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.tenant_id = :tenantId', { tenantId })
      .andWhere('tx.status = :status', { status: TransactionStatus.SUCCESS })
      .andWhere('tx.payment_date >= :start AND tx.payment_date <= :end', {
        start: monthStart,
        end: monthEnd,
      })
      .groupBy('tx.payment_type')
      .getRawMany();

    // Pending amounts
    const pendingSupplier = await this.spRepo
      .createQueryBuilder('sp')
      .select('COALESCE(SUM(sp.remaining_amount), 0)', 'total')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID],
      })
      .getRawOne();

    const pendingSubcontractor = await this.scpRepo
      .createQueryBuilder('scp')
      .select('COALESCE(SUM(scp.remaining_amount), 0)', 'total')
      .where('scp.tenant_id = :tenantId', { tenantId })
      .andWhere('scp.status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID],
      })
      .getRawOne();

    // Monthly chart data (last 6 months)
    const monthlyData = await this.txRepo
      .createQueryBuilder('tx')
      .select("TO_CHAR(tx.payment_date, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.tenant_id = :tenantId', { tenantId })
      .andWhere('tx.status = :status', { status: TransactionStatus.SUCCESS })
      .andWhere("tx.payment_date >= NOW() - INTERVAL '6 months'")
      .groupBy("TO_CHAR(tx.payment_date, 'YYYY-MM')")
      .orderBy("TO_CHAR(tx.payment_date, 'YYYY-MM')", 'ASC')
      .getRawMany();

    // Overdue supplier payments
    const overdueCount = await this.spRepo
      .createQueryBuilder('sp')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.status = :status', { status: PaymentStatus.OVERDUE })
      .getCount();

    // Subscription status
    let subscription = null;
    try {
      subscription = await this.getSubscription(tenantId);
    } catch (_) {
      /* no subscription */
    }

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      typeMap[row.type] = parseFloat(row.total);
    }

    return {
      period: {
        month: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
        start: monthStart,
        end: monthEnd,
      },
      kpis: {
        totalPaymentsThisMonth: parseFloat(totalThisMonth?.total ?? '0'),
        subscriptionRevenue: typeMap[TransactionType.SUBSCRIPTION] ?? 0,
        supplierPayments: typeMap[TransactionType.SUPPLIER] ?? 0,
        subcontractorPayments: typeMap[TransactionType.SUBCONTRACTOR] ?? 0,
        pendingSupplierAmount: parseFloat(pendingSupplier?.total ?? '0'),
        pendingSubcontractorAmount: parseFloat(
          pendingSubcontractor?.total ?? '0',
        ),
        overduePayments: overdueCount,
      },
      monthlyChart: monthlyData.map((r) => ({
        month: r.month,
        total: parseFloat(r.total),
      })),
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            nextBillingDate: subscription.nextBillingDate,
            accessRestricted: subscription.accessRestricted,
          }
        : null,
    };
  }

  // ── W14: CRON job — runs daily at 08:00 ─────────────────────────────────────

  @Cron('0 8 * * *', { name: 'daily-subscription-check' })
  async runDailyChecks(): Promise<void> {
    this.logger.log('[W14] Running daily subscription and payment checks...');

    const today = new Date().toISOString().slice(0, 10);
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // 1. Mark subscriptions as expired if past nextBillingDate
    const expired = await this.subRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('next_billing_date < :today', { today })
      .andWhere('status NOT IN (:...statuses)', {
        statuses: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED],
      })
      .execute();

    if (expired.affected && expired.affected > 0) {
      this.logger.warn(
        `[W14] ${expired.affected} subscription(s) marked as expired`,
      );
    }

    // 2. Restrict access after 7 days past expiry
    const restricted = await this.subRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ accessRestricted: true })
      .where('status = :status', { status: SubscriptionStatus.EXPIRED })
      .andWhere('next_billing_date <= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('access_restricted = FALSE')
      .execute();

    if (restricted.affected && restricted.affected > 0) {
      this.logger.warn(
        `[W14] ${restricted.affected} tenant(s) access restricted`,
      );
    }

    // 3. Mark supplier payments as overdue
    const overdue = await this.spRepo
      .createQueryBuilder()
      .update(SupplierPayment)
      .set({ status: PaymentStatus.OVERDUE })
      .where('due_date < :today', { today })
      .andWhere('status = :status', { status: PaymentStatus.PENDING })
      .execute();

    if (overdue.affected && overdue.affected > 0) {
      this.logger.warn(
        `[W14] ${overdue.affected} supplier payment(s) marked as overdue`,
      );
    }

    // 4. Log upcoming subscriptions expiring in 3 days (notifications would go here)
    const upcoming = await this.subRepo
      .createQueryBuilder('s')
      .where('s.next_billing_date = :date', { date: in3Days })
      .andWhere('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getMany();

    if (upcoming.length > 0) {
      this.logger.log(
        `[W14] ${upcoming.length} subscription(s) expiring in 3 days — notifications would be sent`,
      );
    }

    this.logger.log('[W14] Daily checks complete');
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async createTransaction(input: {
    transactionId: string;
    tenantId: string;
    paymentType: TransactionType;
    sourceId: string;
    projectId?: string;
    beneficiaryName: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethodType;
    status: TransactionStatus;
    transactionReference?: string;
    gatewayResponse?: object;
  }): Promise<Transaction> {
    const tx = this.txRepo.create({
      ...input,
      paymentDate: new Date(),
    });
    return this.txRepo.save(tx);
  }

  private calcNextBillingDate(
    fromDate: string,
    billingType: BillingType,
  ): string {
    const date = new Date(fromDate);
    if (billingType === BillingType.MONTHLY) {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().slice(0, 10);
  }
}
