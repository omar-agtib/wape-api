import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reception } from './reception.entity';
import { PurchaseOrderLine } from '../purchase-orders/purchase-order-line.entity';
import { Article } from '../articles/article.entity';
import { StockService } from '../stock/stock.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { ReceiveDto } from './dto/receive.dto';
import { ReceptionFilterDto } from './dto/reception-filter.dto';
import { ReceptionStatus, StockMovementType } from '../../common/enums';
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
  async createFromPo(poId: string, lines: PurchaseOrderLine[]): Promise<Reception[]> {
    const receptions = lines.map((line) =>
      this.repo.create({
        purchaseOrderId: poId,
        purchaseOrderLineId: line.id,
        articleId: line.articleId,
        expectedQuantity: line.orderedQuantity,
        receivedQuantity: 0,
        status: ReceptionStatus.PENDING,
      }),
    );
    return this.repo.save(receptions);
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  async findAll(tenantId: string, filters: ReceptionFilterDto): Promise<PaginatedResult<Reception>> {
    const { page = 1, limit = 20 } = filters;

    // Get all PO ids that belong to this tenant first, then filter receptions
    const tenantPoIds = await this.lineRepo.manager
      .createQueryBuilder()
      .select('po.id')
      .from('purchase_orders', 'po')
      .where('po.tenant_id = :tenantId', { tenantId })
      .getRawMany();

    const poIds = tenantPoIds.map((r: { po_id: string }) => r.po_id);

    if (poIds.length === 0) {
      return paginate([], 0, page, limit);
    }

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.purchase_order_id IN (:...poIds)', { poIds });

    if (filters.purchaseOrderId) {
      qb.andWhere('r.purchase_order_id = :poId', { poId: filters.purchaseOrderId });
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
  async receive(tenantId: string, receptionId: string, dto: ReceiveDto, userId: string): Promise<{
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

    // RG20 — check PO is not completed
    const po = await this.poService.findOneRaw(tenantId, reception.purchaseOrderId);
    if (po.status === 'completed') {
      throw new UnprocessableEntityException({
        error: 'PO_COMPLETED',
        message: 'Cannot add receptions to a completed purchase order (RG20)',
      });
    }

    // RG04 — received_qty cannot exceed remaining
    const alreadyReceived = reception.receivedQuantity;
    const remaining = reception.expectedQuantity - alreadyReceived;

    if (dto.receivedQuantity > remaining) {
      throw new UnprocessableEntityException({
        error: 'QUANTITY_EXCEEDS_REMAINING',
        message: `Cannot receive ${dto.receivedQuantity} — only ${remaining} remaining for this line`,
        field: 'receivedQuantity',
        details: {
          expected: reception.expectedQuantity,
          alreadyReceived,
          remaining,
          requested: dto.receivedQuantity,
        },
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let newReception: Reception | undefined;

    try {
      const isFullyReceived = dto.receivedQuantity >= remaining;

      // Update current reception
      reception.receivedQuantity = alreadyReceived + dto.receivedQuantity;
      reception.status = isFullyReceived ? ReceptionStatus.COMPLETED : ReceptionStatus.PARTIAL;
      reception.receivedAt = new Date();
      reception.receivedBy = dto.receivedBy ?? userId;
      if (dto.notes) reception.notes = dto.notes;
      await queryRunner.manager.save(Reception, reception);

      // If partial, create a new reception row for the remainder
      if (!isFullyReceived) {
        const remainder = reception.expectedQuantity - reception.receivedQuantity;
        newReception = queryRunner.manager.create(Reception, {
          purchaseOrderId: reception.purchaseOrderId,
          purchaseOrderLineId: reception.purchaseOrderLineId,
          articleId: reception.articleId,
          expectedQuantity: remainder,
          receivedQuantity: 0,
          status: ReceptionStatus.PENDING,
        });
        await queryRunner.manager.save(Reception, newReception);
      }

      // Update PO line received_quantity
      await queryRunner.manager.increment(
        PurchaseOrderLine,
        { id: reception.purchaseOrderLineId },
        'receivedQuantity',
        dto.receivedQuantity,
      );

      // Add stock to article (W6 — incoming movement)
      await queryRunner.manager.increment(
        Article,
        { id: reception.articleId },
        'stockQuantity',
        dto.receivedQuantity,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Record stock movement (outside transaction is fine — audit log)
    await this.stockService.createMovement({
      tenantId,
      articleId: reception.articleId,
      movementType: StockMovementType.INCOMING,
      quantity: dto.receivedQuantity,
      purchaseOrderId: reception.purchaseOrderId,
    });

    // Evaluate and update PO status (completed / partial / confirmed)
    await this.poService.evaluatePoStatus(tenantId, reception.purchaseOrderId);
    const updatedPo = await this.poService.findOneRaw(tenantId, reception.purchaseOrderId);

    return {
      reception,
      ...(newReception && { newReception }),
      poStatus: updatedPo.status,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findOneWithTenantCheck(tenantId: string, receptionId: string): Promise<Reception> {
    // Join through purchase_orders to enforce tenant isolation
    const reception = await this.repo
      .createQueryBuilder('r')
      .innerJoin('purchase_orders', 'po', 'po.id = r.purchase_order_id AND po.tenant_id = :tenantId', { tenantId })
      .where('r.id = :id', { id: receptionId })
      .getOne();

    if (!reception) {
      throw new NotFoundException({ error: 'RECEPTION_NOT_FOUND', message: `Reception '${receptionId}' not found` });
    }
    return reception;
  }
}