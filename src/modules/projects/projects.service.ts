import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { ProjectFinanceSnapshot } from './project-finance-snapshot.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFilterDto } from './dto/project-filter.dto';
import { ProjectStatus } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectFinanceSnapshot)
    private readonly snapshotRepo: Repository<ProjectFinanceSnapshot>,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    // RG01 — end_date must be after start_date
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_DATE_RANGE',
        message: 'endDate must be strictly after startDate',
        field: 'endDate',
      });
    }

    const project = this.projectRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: ProjectStatus.PLANNED,
      progress: 0,
    });

    const saved = await this.projectRepo.save(project);

    // Create finance snapshot (1 row per project — updated by W7 later)
    const snapshot = this.snapshotRepo.create({
      projectId: saved.id,
      totalBudget: saved.budget,
      totalSpent: 0,
      remainingBudget: saved.budget,
      spentPersonnel: 0,
      spentArticles: 0,
      spentTools: 0,
    });
    await this.snapshotRepo.save(snapshot);

    return saved;
  }

  async findAll(tenantId: string, filters: ProjectFilterDto): Promise<PaginatedResult<Project>> {
    const { page = 1, limit = 20 } = filters;

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL');

    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.clientId) qb.andWhere('p.client_id = :clientId', { clientId: filters.clientId });
    if (filters.search) qb.andWhere('p.name ILIKE :search', { search: `%${filters.search}%` });
    if (filters.startDateFrom) qb.andWhere('p.start_date >= :from', { from: filters.startDateFrom });
    if (filters.startDateTo) qb.andWhere('p.start_date <= :to', { to: filters.startDateTo });

    qb.orderBy('p.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Project & { financeSnapshot?: ProjectFinanceSnapshot }> {
    const project = await this.projectRepo.findOne({
      where: { id, tenantId },
    });
    if (!project) {
      throw new NotFoundException({
        error: 'PROJECT_NOT_FOUND',
        message: `Project '${id}' not found`,
      });
    }

    const financeSnapshot = await this.snapshotRepo.findOne({ where: { projectId: id } });

    return { ...project, financeSnapshot: financeSnapshot ?? undefined };
  }

  async update(tenantId: string, id: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOneRaw(tenantId, id);

    if (dto.startDate || dto.endDate) {
      const start = dto.startDate ?? project.startDate;
      const end = dto.endDate ?? project.endDate;
      if (new Date(end) <= new Date(start)) {
        throw new UnprocessableEntityException({
          error: 'INVALID_DATE_RANGE',
          message: 'endDate must be strictly after startDate',
          field: 'endDate',
        });
      }
    }

    Object.assign(project, dto);
    const saved = await this.projectRepo.save(project);

    // W10 — update finance snapshot total_budget when budget changes
    if (dto.budget !== undefined) {
      await this.snapshotRepo.update(
        { projectId: id },
        {
          totalBudget: dto.budget,
          remainingBudget: dto.budget - (await this.snapshotRepo.findOne({ where: { projectId: id } }))!.totalSpent,
        },
      );
    }

    return saved;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const project = await this.findOneRaw(tenantId, id);
    await this.projectRepo.softRemove(project);
  }

  async getFinance(tenantId: string, projectId: string) {
    const project = await this.findOneRaw(tenantId, projectId);
    const snapshot = await this.snapshotRepo.findOne({ where: { projectId } });
    if (!snapshot) {
      throw new NotFoundException({ error: 'SNAPSHOT_NOT_FOUND', message: 'Finance snapshot not found' });
    }

    const percentConsumed = snapshot.totalBudget > 0
      ? (snapshot.totalSpent / snapshot.totalBudget) * 100
      : 0;

    const alertLevel =
      percentConsumed >= 100 ? 'critical' :
      percentConsumed >= 80  ? 'warning'  : 'normal';

    return {
      projectId,
      projectName: project.name,
      currency: project.currency,
      totalBudget: snapshot.totalBudget,
      totalSpent: snapshot.totalSpent,
      remainingBudget: snapshot.remainingBudget,
      percentConsumed: Math.round(percentConsumed * 100) / 100,
      alertLevel,
      breakdown: {
        personnel: snapshot.spentPersonnel,
        articles: snapshot.spentArticles,
        tools: snapshot.spentTools,
      },
      lastUpdatedAt: snapshot.lastUpdatedAt,
    };
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id, tenantId } });
    if (!project) {
      throw new NotFoundException({ error: 'PROJECT_NOT_FOUND', message: `Project '${id}' not found` });
    }
    return project;
  }

  /** Called by TasksService (W-P1) — update project status + progress */
  async recalculateFromTasks(
    tenantId: string,
    projectId: string,
    taskStatuses: { status: string; progress: number }[],
  ): Promise<void> {
    const project = await this.findOneRaw(tenantId, projectId);

    const avgProgress =
      taskStatuses.length > 0
        ? taskStatuses.reduce((sum, t) => sum + t.progress, 0) / taskStatuses.length
        : 0;

    const hasOnProgress = taskStatuses.some((t) => t.status === 'on_progress');
    const allCompleted = taskStatuses.length > 0 && taskStatuses.every((t) => t.status === 'completed');

    let newStatus = project.status;
    if (allCompleted) newStatus = ProjectStatus.COMPLETED;
    else if (hasOnProgress && project.status === ProjectStatus.PLANNED) newStatus = ProjectStatus.ON_PROGRESS;

    await this.projectRepo.update(projectId, {
      status: newStatus,
      progress: Math.round(avgProgress * 100) / 100,
    });
  }
}