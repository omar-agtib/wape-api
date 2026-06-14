import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reception } from './reception.entity';
import { PurchaseOrderLine } from '../purchase-orders/purchase-order-line.entity';
import { Article } from '../articles/article.entity';
import { StockService } from '../stock/stock.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { ReceiveDto } from './dto/receive.dto';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { ReceptionFilterDto } from './dto/reception-filter.dto';
import {
  PurchaseOrderStatus,
  ReceptionStatus,
  StockMovementType,
} from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ReceptionsService {
  constructor(
    @InjectRepository(Reception)
    private readonly repo: Repository<Reception>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly stockService: StockService,
    private readonly poService: PurchaseOrdersService,
    private readonly dataSource: DataSource,
  ) {}

  // ── W5: Create reception rows when PO is confirmed ───────────────────────────
  async createFromPo(
    poId: string,
    lines: PurchaseOrderLine[],
    tenantId: string,
    projectId?: string,
    supplierId?: string,
  ): Promise<Reception[]> {
    const receptions = lines.map((line) =>
      this.repo.create({
        tenantId,
        purchaseOrderId: poId,
        purchaseOrderLineId: line.id,
        articleId: line.articleId,
        expectedQuantity: line.orderedQuantity,
        receivedQuantity: 0,
        rejectedQuantity: 0,
        status: ReceptionStatus.PENDING,
        projectId,
        supplierId,
      }),
    );
    return this.repo.save(receptions);
  }

  // ── Manual create (New Reception button) ─────────────────────────────────────
  async create(
    tenantId: string,
    dto: CreateReceptionDto,
  ): Promise<Reception[]> {
    // If linked to a PO, validate it belongs to this tenant and auto-fill from it.
    if (dto.purchaseOrderId) {
      const po = await this.poService.findOneRaw(tenantId, dto.purchaseOrderId);

      // Pull the PO lines and create one reception row per line (W5-style),
      // carrying the manual header fields (supplier/project/date/receiver).
      const poLines = await this.lineRepo.find({
        where: { purchaseOrderId: po.id },
      });

      if (poLines.length === 0) {
        throw new UnprocessableEntityException({
          error: 'PO_HAS_NO_LINES',
          message: 'The selected purchase order has no lines to receive',
        });
      }

      const rows = poLines.map((line) =>
        this.repo.create({
          tenantId,
          purchaseOrderId: po.id,
          purchaseOrderLineId: line.id,
          articleId: line.articleId,
          expectedQuantity: line.orderedQuantity,
          receivedQuantity: 0,
          rejectedQuantity: 0,
          status: ReceptionStatus.PENDING,
          supplierId: dto.supplierId ?? po.supplierId,
          supplierName: dto.supplierName,
          projectId: dto.projectId ?? po.projectId,
          deliveryDate: dto.deliveryDate,
          receivedBy: dto.receivedBy,
          receivedByName: dto.receivedByName,
          notes: dto.notes,
        }),
      );
      return this.repo.save(rows);
    }

    // No PO — manual reception. Either explicit lines, or a header-only row.
    if (dto.lines && dto.lines.length > 0) {
      const rows = dto.lines.map((line) =>
        this.repo.create({
          tenantId,
          articleId: line.articleId,
          expectedQuantity: line.expectedQuantity,
          receivedQuantity: 0,
          rejectedQuantity: 0,
          status: ReceptionStatus.PENDING,
          supplierId: dto.supplierId,
          supplierName: dto.supplierName,
          projectId: dto.projectId,
          deliveryDate: dto.deliveryDate,
          receivedBy: dto.receivedBy,
          receivedByName: dto.receivedByName,
          notes: dto.notes,
        }),
      );
      return this.repo.save(rows);
    }

    // Header-only reception (no PO, no lines) — matches the empty New Reception form.
    const header = this.repo.create({
      tenantId,
      receivedQuantity: 0,
      rejectedQuantity: 0,
      status: ReceptionStatus.PENDING,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      projectId: dto.projectId,
      deliveryDate: dto.deliveryDate,
      receivedBy: dto.receivedBy,
      receivedByName: dto.receivedByName,
      notes: dto.notes,
    });
    return [await this.repo.save(header)];
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    filters: ReceptionFilterDto,
  ): Promise<PaginatedResult<Reception>> {
    const { page = 1, limit = 20 } = filters;

    // Now that receptions carry tenant_id directly, scope on it.
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId });

    if (filters.purchaseOrderId) {
      qb.andWhere('r.purchase_order_id = :poId', {
        poId: filters.purchaseOrderId,
      });
    }
    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.articleId) {
      qb.andWhere('r.article_id = :aid', { aid: filters.articleId });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  // ── W6: Receive goods ────────────────────────────────────────────────────────
  async receive(
    tenantId: string,
    receptionId: string,
    dto: ReceiveDto,
  ): Promise<{
    reception: Reception;
    newReception?: Reception;
    poStatus: string;
  }> {
    const reception = await this.findOneWithTenantCheck(tenantId, receptionId);

    if (reception.status === ReceptionStatus.COMPLETED) {
      throw new UnprocessableEntityException({
        error: 'RECEPTION_ALREADY_COMPLETED',
        message: 'This reception line is already completed',
      });
    }

    // Guard: only PO-derived lines (with article + expected qty) are receivable
    // through this per-line path. Header-only manual receptions are not.
    if (
      !reception.purchaseOrderId ||
      !reception.purchaseOrderLineId ||
      !reception.articleId ||
      reception.expectedQuantity == null
    ) {
      throw new UnprocessableEntityException({
        error: 'RECEPTION_NOT_RECEIVABLE',
        message: 'This reception has no purchase-order line to receive against',
      });
    }

    // After the guard, these are guaranteed defined.
    const purchaseOrderId = reception.purchaseOrderId;
    const purchaseOrderLineId = reception.purchaseOrderLineId;
    const articleId = reception.articleId;
    const expectedQuantity = reception.expectedQuantity;

    // RG20 — check PO is not completed
    const po = await this.poService.findOneRaw(tenantId, purchaseOrderId);
    if (po.status === PurchaseOrderStatus.COMPLETED) {
      throw new UnprocessableEntityException({
        error: 'PO_COMPLETED',
        message: 'Cannot add receptions to a completed purchase order (RG20)',
      });
    }

    // RG04 — received_qty + rejected_qty cannot exceed remaining
    const rejectedNow = dto.rejectedQuantity ?? 0;
    const alreadyReceived = reception.receivedQuantity;
    const alreadyRejected = reception.rejectedQuantity;
    const remaining = expectedQuantity - alreadyReceived - alreadyRejected;
    const consumed = dto.receivedQuantity + rejectedNow;

    if (consumed > remaining) {
      throw new UnprocessableEntityException({
        error: 'QUANTITY_EXCEEDS_REMAINING',
        message: `Cannot process ${consumed} (received ${dto.receivedQuantity} + rejected ${rejectedNow}) — only ${remaining} remaining for this line`,
        field: 'receivedQuantity',
        details: {
          expected: expectedQuantity,
          alreadyReceived,
          alreadyRejected,
          remaining,
          requestedReceived: dto.receivedQuantity,
          requestedRejected: rejectedNow,
        },
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let newReception: Reception | undefined;

    try {
      // The line is fully resolved when received + rejected covers the remainder.
      const isFullyResolved = consumed >= remaining;

      reception.receivedQuantity = alreadyReceived + dto.receivedQuantity;
      reception.rejectedQuantity = alreadyRejected + rejectedNow;
      reception.status = isFullyResolved
        ? ReceptionStatus.COMPLETED
        : ReceptionStatus.PARTIAL;
      reception.receivedAt = new Date();
      if (dto.receivedBy) reception.receivedBy = dto.receivedBy;
      if (dto.receivedByName) reception.receivedByName = dto.receivedByName;
      if (!reception.deliveryDate)
        reception.deliveryDate = new Date().toISOString().slice(0, 10);
      if (dto.notes) reception.notes = dto.notes;
      await queryRunner.manager.save(Reception, reception);

      // If still open, create a new pending row for the remainder.
      if (!isFullyResolved) {
        const remainder =
          expectedQuantity -
          reception.receivedQuantity -
          reception.rejectedQuantity;
        newReception = queryRunner.manager.create(Reception, {
          tenantId,
          purchaseOrderId,
          purchaseOrderLineId,
          articleId,
          expectedQuantity: remainder,
          receivedQuantity: 0,
          rejectedQuantity: 0,
          status: ReceptionStatus.PENDING,
          supplierId: reception.supplierId,
          projectId: reception.projectId,
        });
        await queryRunner.manager.save(Reception, newReception);
      }

      // Update PO line received_quantity (rejected does NOT count as received)
      await queryRunner.manager.increment(
        PurchaseOrderLine,
        { id: purchaseOrderLineId },
        'receivedQuantity',
        dto.receivedQuantity,
      );

      // Add only the received quantity to article stock (rejected is excluded)
      if (dto.receivedQuantity > 0) {
        await queryRunner.manager.increment(
          Article,
          { id: articleId },
          'stockQuantity',
          dto.receivedQuantity,
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Record stock movement (audit log) — only for received goods
    if (dto.receivedQuantity > 0) {
      await this.stockService.createMovement({
        tenantId,
        articleId,
        movementType: StockMovementType.INCOMING,
        quantity: dto.receivedQuantity,
        purchaseOrderId,
      });
    }

    // Re-evaluate PO status (completed / partial / confirmed)
    await this.poService.evaluatePoStatus(tenantId, purchaseOrderId);
    const updatedPo = await this.poService.findOneRaw(
      tenantId,
      purchaseOrderId,
    );

    return {
      reception,
      ...(newReception && { newReception }),
      poStatus: updatedPo.status,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findOneWithTenantCheck(
    tenantId: string,
    receptionId: string,
  ): Promise<Reception> {
    const reception = await this.repo
      .createQueryBuilder('r')
      .where('r.id = :id AND r.tenant_id = :tenantId', {
        id: receptionId,
        tenantId,
      })
      .getOne();

    if (!reception) {
      throw new NotFoundException({
        error: 'RECEPTION_NOT_FOUND',
        message: `Reception '${receptionId}' not found`,
      });
    }
    return reception;
  }
}
