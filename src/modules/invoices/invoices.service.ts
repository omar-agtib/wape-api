import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { InvoiceStatus } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateInvoiceInput {
  tenantId: string;
  attachmentId: string;
  subcontractorId: string;
  projectId: string;
  amount: number;
  currency: string;
}

// Valid one-way transitions (RG19 — no regression)
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.PENDING_VALIDATION]: [InvoiceStatus.VALIDATED],
  [InvoiceStatus.VALIDATED]: [InvoiceStatus.PAID],
  [InvoiceStatus.PAID]: [],
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
  ) {}

  // ── Called by W7 ────────────────────────────────────────────────────────────

  async createFromAttachment(input: CreateInvoiceInput): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber(input.tenantId);

    const invoice = this.repo.create({
      tenantId: input.tenantId,
      invoiceNumber,
      attachmentId: input.attachmentId,
      subcontractorId: input.subcontractorId,
      projectId: input.projectId,
      amount: input.amount,
      currency: input.currency,
      status: InvoiceStatus.PENDING_VALIDATION,
      issuedAt: new Date(),
    });

    return this.repo.save(invoice);
  }

  // ── Find ────────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    filters: InvoiceFilterDto,
  ): Promise<PaginatedResult<Invoice>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.repo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId });

    if (filters.status)
      qb.andWhere('i.status = :status', { status: filters.status });
    if (filters.projectId)
      qb.andWhere('i.project_id = :pid', { pid: filters.projectId });
    if (filters.subcontractorId)
      qb.andWhere('i.subcontractor_id = :sid', {
        sid: filters.subcontractorId,
      });

    qb.orderBy('i.issued_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.repo.findOne({ where: { id, tenantId } });
    if (!invoice) {
      throw new NotFoundException({
        error: 'INVOICE_NOT_FOUND',
        message: `Invoice '${id}' not found`,
      });
    }
    return invoice;
  }

  // ── Validate (W8) ───────────────────────────────────────────────────────────

  async validate(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);
    this.assertTransition(invoice.status, InvoiceStatus.VALIDATED);

    await this.repo.update(id, {
      status: InvoiceStatus.VALIDATED,
      validatedAt: new Date(),
      // pdfUrl → populated asynchronously in Sprint 5 (BullMQ PDF generation)
      // For now: stub with a placeholder
      pdfUrl: `pending-generation/INV-${invoice.invoiceNumber}.pdf`,
    });

    return this.findOne(tenantId, id);
  }

  // ── Mark paid ───────────────────────────────────────────────────────────────

  async markPaid(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);
    this.assertTransition(invoice.status, InvoiceStatus.PAID);

    await this.repo.update(id, {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
    });

    return this.findOne(tenantId, id);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private assertTransition(current: InvoiceStatus, next: InvoiceStatus): void {
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new UnprocessableEntityException({
        error: 'INVOICE_STATUS_REGRESSION',
        message: `Cannot transition invoice from '${current}' to '${next}'. Invoice statuses are one-way (RG19).`,
        details: {
          current,
          requested: next,
          allowed: ALLOWED_TRANSITIONS[current],
        },
      });
    }
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('EXTRACT(YEAR FROM i.issued_at) = :year', { year })
      .getCount();

    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }
}
