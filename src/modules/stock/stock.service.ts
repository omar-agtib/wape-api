import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockMovementType } from '../../common/enums';
import { StockFilterDto } from './dto/stock-filter.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { ArticlesService } from '../articles/articles.service';

export interface CreateStockMovementInput {
  tenantId: string;
  articleId: string;
  movementType: StockMovementType;
  quantity: number;
  projectId?: string;
  taskId?: string;
  purchaseOrderId?: string;
  responsibleId?: string;
  notes?: string;
}

// Shape returned by the joined findAll query (ready-to-display rows).
export interface StockMovementRow {
  id: string;
  movementType: StockMovementType;
  quantity: number;
  movementDate: Date;
  notes: string | null;
  articleId: string | null;
  articleName: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskName: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repo: Repository<StockMovement>,
    private readonly articlesService: ArticlesService,
  ) {}

  // ── Internal: used by W1/W2 automation (unchanged) ──────────────────────────
  async createMovement(
    input: CreateStockMovementInput,
  ): Promise<StockMovement> {
    const movement = this.repo.create({
      ...input,
      movementDate: new Date(),
    });
    return this.repo.save(movement);
  }

  // ── Manual movement (user-created via the UI) ───────────────────────────────
  // Manual movements are INCOMING (stock entry) or CONSUMED (stock exit).
  // RESERVED is owned by task automation and cannot be created manually.
  async createManualMovement(
    tenantId: string,
    dto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    if (
      dto.movementType !== StockMovementType.INCOMING &&
      dto.movementType !== StockMovementType.CONSUMED
    ) {
      throw new UnprocessableEntityException({
        error: 'INVALID_MANUAL_MOVEMENT_TYPE',
        message: 'Only INCOMING or CONSUMED movements can be created manually',
        field: 'movementType',
      });
    }

    // Validate the article belongs to this tenant (throws if not found).
    const article = await this.articlesService.findOneRaw(
      tenantId,
      dto.articleId,
    );

    // Adjust article stock.
    if (dto.movementType === StockMovementType.INCOMING) {
      await this.articlesService.addStock(article.id, dto.quantity);
    } else {
      // CONSUMED — guarded decrement (cannot go negative).
      const newStock = article.stockQuantity - dto.quantity;
      if (newStock < 0) {
        throw new UnprocessableEntityException({
          error: 'STOCK_CANNOT_BE_NEGATIVE',
          message: `Removing ${dto.quantity} units of '${article.name}' would make stock negative (current: ${article.stockQuantity})`,
          field: 'quantity',
        });
      }
      await this.articlesService.removeStock(article.id, dto.quantity);
    }

    // Record the movement.
    const movement = this.repo.create({
      tenantId,
      articleId: dto.articleId,
      movementType: dto.movementType,
      quantity: dto.quantity,
      projectId: dto.projectId,
      responsibleId: dto.responsibleId,
      notes: dto.notes,
      movementDate: dto.movementDate ? new Date(dto.movementDate) : new Date(),
    });
    return this.repo.save(movement);
  }

  // ── List with resolved names ────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    filters: StockFilterDto,
  ): Promise<PaginatedResult<StockMovementRow>> {
    const { page = 1, limit = 20 } = filters;

    const qb = this.repo
      .createQueryBuilder('sm')
      .leftJoin('articles', 'a', 'a.id = sm.article_id')
      .leftJoin('projects', 'proj', 'proj.id = sm.project_id')
      .leftJoin('tasks', 't', 't.id = sm.task_id')
      .leftJoin('personnel', 'p', 'p.id = sm.responsible_id')
      .where('sm.tenant_id = :tenantId', { tenantId });

    if (filters.articleId)
      qb.andWhere('sm.article_id = :articleId', {
        articleId: filters.articleId,
      });
    if (filters.movementType)
      qb.andWhere('sm.movement_type = :type', { type: filters.movementType });
    if (filters.projectId)
      qb.andWhere('sm.project_id = :projectId', {
        projectId: filters.projectId,
      });
    if (filters.taskId)
      qb.andWhere('sm.task_id = :taskId', { taskId: filters.taskId });
    if (filters.dateFrom)
      qb.andWhere('sm.movement_date >= :from', { from: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere('sm.movement_date <= :to', { to: filters.dateTo });

    qb.select([
      'sm.id AS id',
      'sm.movement_type AS "movementType"',
      'sm.quantity AS quantity',
      'sm.movement_date AS "movementDate"',
      'sm.notes AS notes',
      'sm.article_id AS "articleId"',
      'a.name AS "articleName"',
      'sm.project_id AS "projectId"',
      'proj.name AS "projectName"',
      'sm.task_id AS "taskId"',
      't.name AS "taskName"',
      'sm.responsible_id AS "responsibleId"',
      'p.full_name AS "responsibleName"',
    ])
      .orderBy('sm.movement_date', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<StockMovementRow>(),
      qb.getCount(),
    ]);

    return paginate(rows, total, page, limit);
  }
}
