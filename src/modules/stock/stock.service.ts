import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockMovementType } from '../../common/enums';
import { StockFilterDto } from './dto/stock-filter.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

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

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repo: Repository<StockMovement>,
  ) {}

  async createMovement(
    input: CreateStockMovementInput,
  ): Promise<StockMovement> {
    const movement = this.repo.create({
      ...input,
      movementDate: new Date(),
    });
    return this.repo.save(movement);
  }

  async findAll(
    tenantId: string,
    filters: StockFilterDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const { page = 1, limit = 20 } = filters;

    const qb = this.repo
      .createQueryBuilder('sm')
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

    qb.orderBy('sm.movement_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}
