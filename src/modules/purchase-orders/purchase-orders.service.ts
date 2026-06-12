import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';
import { ContactsService } from '../contacts/contacts.service';
import { ArticlesService } from '../articles/articles.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PoFilterDto } from './dto/po-filter.dto';
import { PurchaseOrderStatus, ContactType } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

export interface PurchaseOrderRow {
  id: string;
  orderNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  projectId: string | null;
  projectName: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  orderDate: Date;
  expectedDelivery: string | null;
  notes: string | null;
  lineCount: string;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    private readonly contactsService: ContactsService,
    private readonly articlesService: ArticlesService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException({
        error: 'LINES_REQUIRED',
        message: 'At least one purchase order line is required',
        field: 'lines',
      });
    }

    // RG08 — supplier must be a contact with type=supplier
    await this.contactsService.verifyType(
      tenantId,
      dto.supplierId,
      ContactType.SUPPLIER,
    );

    // RG14 — verify all articles belong to tenant
    for (const line of dto.lines) {
      await this.articlesService.findOneRaw(tenantId, line.articleId);
    }

    // Generate order number BC-YYYY-NNNN
    const orderNumber = await this.generateOrderNumber(tenantId);

    // Calculate total
    const totalAmount = dto.lines.reduce(
      (sum, l) => sum + l.orderedQuantity * l.unitPrice,
      0,
    );

    const po = this.poRepo.create({
      tenantId,
      orderNumber,
      supplierId: dto.supplierId,
      projectId: dto.projectId,
      currency: dto.currency,
      notes: dto.notes,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount,
      createdBy: userId,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      expectedDelivery: dto.expectedDelivery,
    });

    const savedPo = await this.poRepo.save(po);

    // Create lines
    const lines = dto.lines.map((l) =>
      this.lineRepo.create({
        purchaseOrderId: savedPo.id,
        articleId: l.articleId,
        orderedQuantity: l.orderedQuantity,
        receivedQuantity: 0,
        unitPrice: l.unitPrice,
        currency: l.currency,
        totalPrice: l.orderedQuantity * l.unitPrice,
      }),
    );
    await this.lineRepo.save(lines);

    return this.findOneRaw(tenantId, savedPo.id);
  }

  // ── Find ────────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    filters: PoFilterDto,
  ): Promise<PaginatedResult<PurchaseOrderRow>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoin('contacts', 'c', 'c.id = po.supplier_id')
      .leftJoin('projects', 'proj', 'proj.id = po.project_id')
      .where('po.tenant_id = :tenantId', { tenantId })
      .andWhere('po.deleted_at IS NULL');

    if (filters.status)
      qb.andWhere('po.status = :status', { status: filters.status });
    if (filters.supplierId)
      qb.andWhere('po.supplier_id = :sid', { sid: filters.supplierId });
    if (filters.projectId)
      qb.andWhere('po.project_id = :pid', { pid: filters.projectId });
    if (filters.dateFrom)
      qb.andWhere('po.order_date >= :from', { from: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere('po.order_date <= :to', { to: filters.dateTo });

    qb.select([
      'po.id AS id',
      'po.order_number AS "orderNumber"',
      'po.supplier_id AS "supplierId"',
      'c.legal_name AS "supplierName"',
      'po.project_id AS "projectId"',
      'proj.name AS "projectName"',
      'po.status AS status',
      'po.currency AS currency',
      'po.total_amount AS "totalAmount"',
      'po.order_date AS "orderDate"',
      'po.expected_delivery AS "expectedDelivery"',
      'po.notes AS notes',
      '(SELECT COUNT(*) FROM purchase_order_lines pol WHERE pol.purchase_order_id = po.id) AS "lineCount"',
    ])
      .orderBy('po.order_date', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<PurchaseOrderRow>(),
      qb.getCount(),
    ]);

    return paginate(rows, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const po = await this.poRepo.findOne({ where: { id, tenantId } });
    if (!po)
      throw new NotFoundException({
        error: 'PO_NOT_FOUND',
        message: `Purchase order '${id}' not found`,
      });

    const lines = await this.lineRepo.find({ where: { purchaseOrderId: id } });
    return { ...po, lines };
  }

  async findByProject(
    tenantId: string,
    projectId: string,
  ): Promise<PurchaseOrder[]> {
    return this.poRepo.find({
      where: { tenantId, projectId },
      order: { orderDate: 'DESC' },
    });
  }

  // ── Confirm (W5) ─────────────────────────────────────────────────────────────

  async confirm(
    tenantId: string,
    id: string,
  ): Promise<{ purchaseOrder: PurchaseOrder; receptionsCreated: number }> {
    const po = await this.findOneRaw(tenantId, id);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new UnprocessableEntityException({
        error: 'PO_NOT_DRAFT',
        message: `Purchase order '${po.orderNumber}' is already ${po.status}`,
        details: { currentStatus: po.status },
      });
    }

    await this.poRepo.update(id, { status: PurchaseOrderStatus.CONFIRMED });

    const lines = await this.lineRepo.find({ where: { purchaseOrderId: id } });

    // W5 — lazy import to avoid circular dependency
    // const { ReceptionsService } = await import('../receptions/receptions.service');
    // NOTE: ReceptionsService is injected at runtime through module resolution
    // The actual W5 reception creation is triggered in the controller layer
    // by calling receptionsService.createFromPo() after confirm() returns.
    // This avoids a circular module dependency between POs ↔ Receptions.

    const updatedPo = await this.findOneRaw(tenantId, id);
    return { purchaseOrder: updatedPo, receptionsCreated: lines.length };
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.findOneRaw(tenantId, id);

    // Only draft or confirmed POs can be cancelled — once receiving has
    // started (partial/completed) cancelling would corrupt stock/reception data.
    if (
      po.status !== PurchaseOrderStatus.DRAFT &&
      po.status !== PurchaseOrderStatus.CONFIRMED
    ) {
      throw new UnprocessableEntityException({
        error: 'PO_CANNOT_BE_CANCELLED',
        message: `Purchase order '${po.orderNumber}' cannot be cancelled (status: ${po.status})`,
        details: { currentStatus: po.status },
      });
    }

    await this.poRepo.update(id, { status: PurchaseOrderStatus.CANCELLED });
    return this.findOneRaw(tenantId, id);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({ where: { id, tenantId } });
    if (!po)
      throw new NotFoundException({
        error: 'PO_NOT_FOUND',
        message: `Purchase order '${id}' not found`,
      });
    return po;
  }

  async getLines(poId: string): Promise<PurchaseOrderLine[]> {
    return this.lineRepo.find({ where: { purchaseOrderId: poId } });
  }

  async updateLineReceivedQty(lineId: string, delta: number): Promise<void> {
    await this.lineRepo.increment({ id: lineId }, 'receivedQuantity', delta);
  }

  async evaluatePoStatus(tenantId: string, poId: string): Promise<void> {
    const lines = await this.lineRepo.find({
      where: { purchaseOrderId: poId },
    });
    const allDone = lines.every((l) => l.receivedQuantity >= l.orderedQuantity);
    const someDone = lines.some((l) => l.receivedQuantity > 0);

    const newStatus = allDone
      ? PurchaseOrderStatus.COMPLETED
      : someDone
        ? PurchaseOrderStatus.PARTIAL
        : PurchaseOrderStatus.CONFIRMED;

    await this.poRepo.update(poId, { status: newStatus });
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BC-${year}-`;

    // Find the highest existing order_number for this tenant+year.
    // withDeleted() so soft-deleted rows count too — the UNIQUE constraint
    // spans all rows, so their numbers must not be reused.
    const last = await this.poRepo
      .createQueryBuilder('po')
      .withDeleted()
      .where('po.tenant_id = :tenantId', { tenantId })
      .andWhere('po.order_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.order_number', 'DESC')
      .getOne();

    let nextSeq = 1;
    if (last?.orderNumber) {
      const tail = last.orderNumber.slice(prefix.length);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
