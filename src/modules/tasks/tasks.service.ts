import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskPersonnel } from './task-personnel.entity';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddTaskPersonnelDto, UpdateTaskPersonnelDto } from './dto/task-resource.dto';
import { TaskStatus } from '../../common/enums';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskPersonnel)
    private readonly tpRepo: Repository<TaskPersonnel>,
    @InjectRepository(Personnel)
    private readonly personnelRepo: Repository<Personnel>,
    private readonly projectsService: ProjectsService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateTaskDto): Promise<Task> {
    // RG01 — end_date >= start_date
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_DATE_RANGE',
        message: 'endDate must be >= startDate for tasks',
        field: 'endDate',
      });
    }

    // Verify project belongs to tenant
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
    filters: {
      projectId?: string;
      status?: TaskStatus;
      search?: string;
    },
  ): Promise<PaginatedResult<Task>> {
    const { page = 1, limit = 20 } = pagination;

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if (filters.projectId) qb.andWhere('t.project_id = :projectId', { projectId: filters.projectId });
    if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.search) qb.andWhere('t.name ILIKE :search', { search: `%${filters.search}%` });

    qb.orderBy('t.start_date', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Task & { personnel: TaskPersonnel[] }> {
    const task = await this.taskRepo.findOne({ where: { id, tenantId } });
    if (!task) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: `Task '${id}' not found` });
    }

    const personnel = await this.tpRepo.find({
      where: { taskId: id },
      relations: ['personnel'],
    });

    return { ...task, personnel };
  }

  async findByProject(tenantId: string, projectId: string): Promise<Task[]> {
    await this.projectsService.findOneRaw(tenantId, projectId);
    return this.taskRepo.find({
      where: { projectId, tenantId },
      order: { startDate: 'ASC' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOneRaw(tenantId, id);

    if (dto.startDate || dto.endDate) {
      const start = dto.startDate ?? task.startDate;
      const end = dto.endDate ?? task.endDate;
      if (new Date(end) < new Date(start)) {
        throw new UnprocessableEntityException({
          error: 'INVALID_DATE_RANGE',
          message: 'endDate must be >= startDate',
          field: 'endDate',
        });
      }
    }

    Object.assign(task, dto);
    const saved = await this.taskRepo.save(task);

    // If progress was updated, recalculate project progress (W-P1)
    if (dto.progress !== undefined) {
      await this.triggerWP1(tenantId, task.projectId);
    }

    return saved;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const task = await this.findOneRaw(tenantId, id);
    await this.taskRepo.softRemove(task);
  }

  // ── Status Engine ───────────────────────────────────────────────────────────

  async changeStatus(tenantId: string, id: string, newStatus: TaskStatus): Promise<Task> {
    const task = await this.findOneRaw(tenantId, id);

    this.validateStatusTransition(task.status, newStatus);

    // Set progress to 100 when completing
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === TaskStatus.COMPLETED) updates.progress = 100;
    if (newStatus === TaskStatus.ON_PROGRESS && task.progress === 0) updates.progress = 0;

    Object.assign(task, updates);
    const saved = await this.taskRepo.save(task);

    // W-P1 — cascade project status + progress
    await this.triggerWP1(tenantId, task.projectId);

    return saved;
  }

  private validateStatusTransition(current: TaskStatus, next: TaskStatus): void {
    const allowed: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PLANNED]: [TaskStatus.ON_PROGRESS],
      [TaskStatus.ON_PROGRESS]: [TaskStatus.COMPLETED],
      [TaskStatus.COMPLETED]: [],
    };

    if (!allowed[current].includes(next)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from '${current}' to '${next}'. Allowed: ${allowed[current].join(', ') || 'none (terminal state)'}`,
        details: { current, requested: next },
      });
    }
  }

  // ── W-P1: Project status + progress cascade ─────────────────────────────────

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

  // ── Task Personnel resource ──────────────────────────────────────────────────

  async addPersonnel(
    tenantId: string,
    taskId: string,
    dto: AddTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    const task = await this.findOneRaw(tenantId, taskId);

    // RG14 — personnel must belong to same tenant
    const personnel = await this.personnelRepo.findOne({
      where: { id: dto.personnelId, tenantId },
    });
    if (!personnel) {
      throw new UnprocessableEntityException({
        error: 'CROSS_TENANT_ACCESS',
        message: `Personnel '${dto.personnelId}' does not belong to this tenant`,
        field: 'personnelId',
      });
    }

    // Pre-fill unit_cost from personnel.costPerHour if not provided
    const unitCost = dto.unitCost ?? personnel.costPerHour;
    const currency = dto.currency ?? personnel.currency;
    const totalCost = dto.quantity * unitCost;

    const tp = this.tpRepo.create({
      taskId,
      personnelId: dto.personnelId,
      quantity: dto.quantity,
      unitCost,
      currency,
      totalCost,
    });

    const saved = await this.tpRepo.save(tp);
    await this.recalculateTaskCost(task);
    return saved;
  }

  async updatePersonnel(
    tenantId: string,
    taskId: string,
    resourceId: string,
    dto: UpdateTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    const task = await this.findOneRaw(tenantId, taskId);
    const tp = await this.findTaskPersonnel(taskId, resourceId);

    if (dto.quantity !== undefined) tp.quantity = dto.quantity;
    if (dto.unitCost !== undefined) tp.unitCost = dto.unitCost;
    if (dto.currency !== undefined) tp.currency = dto.currency;
    tp.totalCost = tp.quantity * tp.unitCost;

    const saved = await this.tpRepo.save(tp);
    await this.recalculateTaskCost(task);
    return saved;
  }

  async removePersonnel(tenantId: string, taskId: string, resourceId: string): Promise<void> {
    const task = await this.findOneRaw(tenantId, taskId);
    const tp = await this.findTaskPersonnel(taskId, resourceId);
    await this.tpRepo.remove(tp);
    await this.recalculateTaskCost(task);
  }

  async listPersonnel(tenantId: string, taskId: string): Promise<TaskPersonnel[]> {
    await this.findOneRaw(tenantId, taskId);
    return this.tpRepo.find({
      where: { taskId },
      relations: ['personnel'],
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id, tenantId } });
    if (!task) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: `Task '${id}' not found` });
    }
    return task;
  }

  private async findTaskPersonnel(taskId: string, resourceId: string): Promise<TaskPersonnel> {
    const tp = await this.tpRepo.findOne({ where: { id: resourceId, taskId } });
    if (!tp) {
      throw new NotFoundException({
        error: 'TASK_RESOURCE_NOT_FOUND',
        message: `Resource '${resourceId}' not found on task '${taskId}'`,
      });
    }
    return tp;
  }

  private async recalculateTaskCost(task: Task): Promise<void> {
    const resources = await this.tpRepo.find({ where: { taskId: task.id } });
    const estimatedCost = resources.reduce((sum, r) => sum + r.totalCost, 0);
    await this.taskRepo.update(task.id, { estimatedCost });
  }
}