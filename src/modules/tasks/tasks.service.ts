import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskPersonnel } from './task-personnel.entity';
import { TaskArticle } from './task-article.entity';
import { TaskTool } from './task-tool.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Article } from '../articles/article.entity';
import { Tool } from '../tools/tool.entity';
import { ArticlesService } from '../articles/articles.service';
import { ToolsService } from '../tools/tools.service';
import { StockService } from '../stock/stock.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  AddTaskPersonnelDto,
  UpdateTaskPersonnelDto,
  AddTaskArticleDto,
  UpdateTaskArticleDto,
  AddTaskToolDto,
  UpdateTaskToolDto,
} from './dto/task-resource.dto';
import { TaskStatus, StockMovementType, ToolStatus } from '../../common/enums';
import {
  PaginationDto,
  paginate,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { MovementDirection } from '../tools/dto/tool-movement.dto';
import { ToolMovement } from '../tools/tool-movement.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskPersonnel)
    private readonly tpRepo: Repository<TaskPersonnel>,
    @InjectRepository(TaskArticle)
    private readonly taRepo: Repository<TaskArticle>,
    @InjectRepository(TaskTool) private readonly ttRepo: Repository<TaskTool>,
    @InjectRepository(Personnel)
    private readonly personnelRepo: Repository<Personnel>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Tool) private readonly toolRepo: Repository<Tool>,
    private readonly articlesService: ArticlesService,
    private readonly toolsService: ToolsService,
    private readonly stockService: StockService,
    private readonly projectsService: ProjectsService,
    private readonly dataSource: DataSource,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateTaskDto): Promise<Task> {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_DATE_RANGE',
        message: 'endDate must be >= startDate',
        field: 'endDate',
      });
    }
    await this.projectsService.findOneRaw(tenantId, dto.projectId);

    const task = this.taskRepo.create({
      ...dto,
      tenantId,
      status: TaskStatus.PLANNED,
      progress: dto.progress ?? 0,
      estimatedCost: 0,
    });
    return this.taskRepo.save(task);
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters: { projectId?: string; status?: TaskStatus; search?: string },
  ): Promise<PaginatedResult<Task>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if (filters.projectId)
      qb.andWhere('t.project_id = :pid', { pid: filters.projectId });
    if (filters.status)
      qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.search)
      qb.andWhere('t.name ILIKE :s', { s: `%${filters.search}%` });

    qb.orderBy('t.start_date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const task = await this.findOneRaw(tenantId, id);
    const [personnel, articles, tools] = await Promise.all([
      this.tpRepo.find({ where: { taskId: id }, relations: ['personnel'] }),
      this.taRepo.find({ where: { taskId: id }, relations: ['article'] }),
      this.ttRepo.find({ where: { taskId: id }, relations: ['tool'] }),
    ]);
    return { ...task, personnel, articles, tools };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOneRaw(tenantId, id);
    if (dto.startDate || dto.endDate) {
      const s = dto.startDate ?? task.startDate;
      const e = dto.endDate ?? task.endDate;
      if (new Date(e) < new Date(s)) {
        throw new UnprocessableEntityException({
          error: 'INVALID_DATE_RANGE',
          message: 'endDate must be >= startDate',
          field: 'endDate',
        });
      }
    }
    Object.assign(task, dto);
    const saved = await this.taskRepo.save(task);
    if (dto.progress !== undefined)
      await this.triggerWP1(tenantId, task.projectId);
    return saved;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const task = await this.findOneRaw(tenantId, id);
    await this.taskRepo.softRemove(task);
  }

  // ── Status Engine + W1/W2 ───────────────────────────────────────────────────

  async changeStatus(
    tenantId: string,
    id: string,
    newStatus: TaskStatus,
  ): Promise<Task> {
    const task = await this.findOneRaw(tenantId, id);
    this.validateTransition(task.status, newStatus);

    if (newStatus === TaskStatus.ON_PROGRESS) {
      await this.executeW1(tenantId, task);
    } else if (newStatus === TaskStatus.COMPLETED) {
      await this.executeW2(tenantId, task);
    }

    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === TaskStatus.COMPLETED) updates.progress = 100;
    Object.assign(task, updates);
    const saved = await this.taskRepo.save(task);

    await this.triggerWP1(tenantId, task.projectId);
    return saved;
  }

  // ── W1: planned → on_progress ───────────────────────────────────────────────
  private async executeW1(tenantId: string, task: Task): Promise<void> {
    const articles = await this.taRepo.find({ where: { taskId: task.id } });
    const tools = await this.ttRepo.find({ where: { taskId: task.id } });

    // Step 1: Verify ALL articles have sufficient stock before touching anything (RG02)
    const insufficientList: object[] = [];
    for (const ta of articles) {
      const article = await this.articleRepo.findOne({
        where: { id: ta.articleId },
      });
      if (!article) continue;
      const available = article.stockQuantity - article.reservedQuantity;
      if (available < ta.quantity) {
        insufficientList.push({
          articleId: ta.articleId,
          articleName: article.name,
          required: ta.quantity,
          available,
        });
      }
    }
    if (insufficientList.length > 0) {
      throw new UnprocessableEntityException({
        error: 'INSUFFICIENT_STOCK',
        message:
          'Insufficient stock for one or more articles. Task cannot be started.',
        details: { insufficientArticles: insufficientList },
      });
    }

    // Step 2: All checks passed — execute in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Reserve stock for each article
      for (const ta of articles) {
        await queryRunner.manager.increment(
          Article,
          { id: ta.articleId },
          'reservedQuantity',
          ta.quantity,
        );
        await this.stockService.createMovement({
          tenantId,
          articleId: ta.articleId,
          movementType: StockMovementType.RESERVED,
          quantity: ta.quantity,
          projectId: task.projectId,
          taskId: task.id,
        });
      }

      // OUT movement for each tool (RG11/RG16 already checked in ToolsService)
      for (const tt of tools) {
        const tool = await this.toolRepo.findOne({ where: { id: tt.toolId } });
        if (!tool) continue;
        await queryRunner.manager.update(Tool, tt.toolId, {
          status: ToolStatus.IN_USE,
        });

        // Create auto tool movement record
        // executeW1
        const movement = queryRunner.manager.create(ToolMovement, {
          toolId: tt.toolId,
          movementType: MovementDirection.OUT,
          responsibleId: task.tenantId,
          taskId: task.id,
          isAuto: true,
          movementDate: new Date(),
          notes: `Auto OUT — task '${task.name}' started`,
        });
        await queryRunner.manager.save(movement);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── W2: on_progress → completed ─────────────────────────────────────────────
  private async executeW2(tenantId: string, task: Task): Promise<void> {
    const articles = await this.taRepo.find({ where: { taskId: task.id } });
    const tools = await this.ttRepo.find({ where: { taskId: task.id } });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Consume stock for each article
      for (const ta of articles) {
        const article = await queryRunner.manager.findOne(Article, {
          where: { id: ta.articleId },
        });
        if (!article) continue;

        const newStock = article.stockQuantity - ta.quantity;
        if (newStock < 0) {
          throw new UnprocessableEntityException({
            error: 'STOCK_CANNOT_BE_NEGATIVE',
            message: `Consuming ${ta.quantity} of '${article.name}' would result in negative stock`,
          });
        }

        await queryRunner.manager.update(Article, ta.articleId, {
          stockQuantity: newStock,
          reservedQuantity: Math.max(0, article.reservedQuantity - ta.quantity),
          consumedQuantity: article.consumedQuantity + ta.quantity,
        });

        await this.stockService.createMovement({
          tenantId,
          articleId: ta.articleId,
          movementType: StockMovementType.CONSUMED,
          quantity: ta.quantity,
          projectId: task.projectId,
          taskId: task.id,
        });
      }

      // IN movement for each tool — return to available
      for (const tt of tools) {
        await queryRunner.manager.update(Tool, tt.toolId, {
          status: ToolStatus.AVAILABLE,
        });

        // executeW2
        const movement = queryRunner.manager.create(ToolMovement, {
          toolId: tt.toolId,
          movementType: MovementDirection.IN,
          responsibleId: task.tenantId,
          taskId: task.id,
          isAuto: true,
          movementDate: new Date(),
          notes: `Auto IN — task '${task.name}' completed`,
        });
        await queryRunner.manager.save(movement);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── W-P1 ────────────────────────────────────────────────────────────────────
  private async triggerWP1(tenantId: string, projectId: string): Promise<void> {
    const tasks = await this.taskRepo.find({
      where: { projectId, tenantId },
      select: ['status', 'progress'],
    });
    await this.projectsService.recalculateFromTasks(
      tenantId,
      projectId,
      tasks.map((t) => ({ status: t.status, progress: t.progress })),
    );
  }

  private validateTransition(current: TaskStatus, next: TaskStatus): void {
    const allowed: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PLANNED]: [TaskStatus.ON_PROGRESS],
      [TaskStatus.ON_PROGRESS]: [TaskStatus.COMPLETED],
      [TaskStatus.COMPLETED]: [],
    };
    if (!allowed[current].includes(next)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from '${current}' to '${next}'`,
        details: { current, requested: next, allowed: allowed[current] },
      });
    }
  }

  // ── Personnel resource ───────────────────────────────────────────────────────
  async addPersonnel(
    tenantId: string,
    taskId: string,
    dto: AddTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    await this.findOneRaw(tenantId, taskId);
    const personnel = await this.personnelRepo.findOne({
      where: { id: dto.personnelId, tenantId },
    });
    if (!personnel)
      throw new UnprocessableEntityException({
        error: 'CROSS_TENANT_ACCESS',
        message: `Personnel not found in this tenant`,
        field: 'personnelId',
      });

    const unitCost = dto.unitCost ?? personnel.costPerHour;
    const currency = dto.currency ?? personnel.currency;
    const tp = this.tpRepo.create({
      taskId,
      personnelId: dto.personnelId,
      quantity: dto.quantity,
      unitCost,
      currency,
      totalCost: dto.quantity * unitCost,
    });
    const saved = await this.tpRepo.save(tp);
    await this.recalcCost(taskId);
    return saved;
  }

  async updatePersonnel(
    tenantId: string,
    taskId: string,
    rid: string,
    dto: UpdateTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    await this.findOneRaw(tenantId, taskId);
    const tp = await this.findTpOrFail(taskId, rid);
    if (dto.quantity !== undefined) tp.quantity = dto.quantity;
    if (dto.unitCost !== undefined) tp.unitCost = dto.unitCost;
    if (dto.currency !== undefined) tp.currency = dto.currency;
    tp.totalCost = tp.quantity * tp.unitCost;
    const saved = await this.tpRepo.save(tp);
    await this.recalcCost(taskId);
    return saved;
  }

  async removePersonnel(
    tenantId: string,
    taskId: string,
    rid: string,
  ): Promise<void> {
    await this.findOneRaw(tenantId, taskId);
    const tp = await this.findTpOrFail(taskId, rid);
    await this.tpRepo.remove(tp);
    await this.recalcCost(taskId);
  }

  async listPersonnel(
    tenantId: string,
    taskId: string,
  ): Promise<TaskPersonnel[]> {
    await this.findOneRaw(tenantId, taskId);
    return this.tpRepo.find({ where: { taskId }, relations: ['personnel'] });
  }

  // ── Articles resource ────────────────────────────────────────────────────────
  async addArticle(
    tenantId: string,
    taskId: string,
    dto: AddTaskArticleDto,
  ): Promise<TaskArticle> {
    await this.findOneRaw(tenantId, taskId);
    const article = await this.articleRepo.findOne({
      where: { id: dto.articleId, tenantId },
    });
    if (!article)
      throw new UnprocessableEntityException({
        error: 'CROSS_TENANT_ACCESS',
        message: 'Article not found in this tenant',
        field: 'articleId',
      });

    const unitCost = dto.unitCost ?? article.unitPrice;
    const currency = dto.currency ?? article.currency;
    const ta = this.taRepo.create({
      taskId,
      articleId: dto.articleId,
      quantity: dto.quantity,
      unitCost,
      currency,
      totalCost: dto.quantity * unitCost,
    });
    const saved = await this.taRepo.save(ta);
    await this.recalcCost(taskId);
    return saved;
  }

  async updateArticle(
    tenantId: string,
    taskId: string,
    rid: string,
    dto: UpdateTaskArticleDto,
  ): Promise<TaskArticle> {
    await this.findOneRaw(tenantId, taskId);
    const ta = await this.findTaOrFail(taskId, rid);
    if (dto.quantity !== undefined) ta.quantity = dto.quantity;
    if (dto.unitCost !== undefined) ta.unitCost = dto.unitCost;
    if (dto.currency !== undefined) ta.currency = dto.currency;
    ta.totalCost = ta.quantity * ta.unitCost;
    const saved = await this.taRepo.save(ta);
    await this.recalcCost(taskId);
    return saved;
  }

  async removeArticle(
    tenantId: string,
    taskId: string,
    rid: string,
  ): Promise<void> {
    await this.findOneRaw(tenantId, taskId);
    const ta = await this.findTaOrFail(taskId, rid);
    await this.taRepo.remove(ta);
    await this.recalcCost(taskId);
  }

  async listArticles(tenantId: string, taskId: string): Promise<TaskArticle[]> {
    await this.findOneRaw(tenantId, taskId);
    return this.taRepo.find({ where: { taskId }, relations: ['article'] });
  }

  // ── Tools resource ───────────────────────────────────────────────────────────
  async addTool(
    tenantId: string,
    taskId: string,
    dto: AddTaskToolDto,
  ): Promise<TaskTool> {
    await this.findOneRaw(tenantId, taskId);
    const tool = await this.toolRepo.findOne({
      where: { id: dto.toolId, tenantId },
    });
    if (!tool)
      throw new UnprocessableEntityException({
        error: 'CROSS_TENANT_ACCESS',
        message: 'Tool not found in this tenant',
        field: 'toolId',
      });

    const unitCost = dto.unitCost ?? 0;
    const currency = dto.currency ?? 'MAD';
    const tt = this.ttRepo.create({
      taskId,
      toolId: dto.toolId,
      quantity: dto.quantity,
      unitCost,
      currency,
      totalCost: dto.quantity * unitCost,
    });
    const saved = await this.ttRepo.save(tt);
    await this.recalcCost(taskId);
    return saved;
  }

  async updateTool(
    tenantId: string,
    taskId: string,
    rid: string,
    dto: UpdateTaskToolDto,
  ): Promise<TaskTool> {
    await this.findOneRaw(tenantId, taskId);
    const tt = await this.findTtOrFail(taskId, rid);
    if (dto.quantity !== undefined) tt.quantity = dto.quantity;
    if (dto.unitCost !== undefined) tt.unitCost = dto.unitCost;
    if (dto.currency !== undefined) tt.currency = dto.currency;
    tt.totalCost = tt.quantity * tt.unitCost;
    const saved = await this.ttRepo.save(tt);
    await this.recalcCost(taskId);
    return saved;
  }

  async removeTool(
    tenantId: string,
    taskId: string,
    rid: string,
  ): Promise<void> {
    await this.findOneRaw(tenantId, taskId);
    const tt = await this.findTtOrFail(taskId, rid);
    await this.ttRepo.remove(tt);
    await this.recalcCost(taskId);
  }

  async listTools(tenantId: string, taskId: string): Promise<TaskTool[]> {
    await this.findOneRaw(tenantId, taskId);
    return this.ttRepo.find({ where: { taskId }, relations: ['tool'] });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────
  async findOneRaw(tenantId: string, id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id, tenantId } });
    if (!task)
      throw new NotFoundException({
        error: 'TASK_NOT_FOUND',
        message: `Task '${id}' not found`,
      });
    return task;
  }

  private async recalcCost(taskId: string): Promise<void> {
    const [personnel, articles, tools] = await Promise.all([
      this.tpRepo.find({ where: { taskId } }),
      this.taRepo.find({ where: { taskId } }),
      this.ttRepo.find({ where: { taskId } }),
    ]);
    const total =
      personnel.reduce((s, r) => s + r.totalCost, 0) +
      articles.reduce((s, r) => s + r.totalCost, 0) +
      tools.reduce((s, r) => s + r.totalCost, 0);
    await this.taskRepo.update(taskId, { estimatedCost: total });
  }

  private async findTpOrFail(
    taskId: string,
    id: string,
  ): Promise<TaskPersonnel> {
    const r = await this.tpRepo.findOne({ where: { id, taskId } });
    if (!r)
      throw new NotFoundException({
        error: 'TASK_RESOURCE_NOT_FOUND',
        message: `Personnel resource '${id}' not found`,
      });
    return r;
  }

  private async findTaOrFail(taskId: string, id: string): Promise<TaskArticle> {
    const r = await this.taRepo.findOne({ where: { id, taskId } });
    if (!r)
      throw new NotFoundException({
        error: 'TASK_RESOURCE_NOT_FOUND',
        message: `Article resource '${id}' not found`,
      });
    return r;
  }

  private async findTtOrFail(taskId: string, id: string): Promise<TaskTool> {
    const r = await this.ttRepo.findOne({ where: { id, taskId } });
    if (!r)
      throw new NotFoundException({
        error: 'TASK_RESOURCE_NOT_FOUND',
        message: `Tool resource '${id}' not found`,
      });
    return r;
  }
}
