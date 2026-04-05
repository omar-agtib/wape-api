import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { TaskPersonnel } from '../tasks/task-personnel.entity';
import { TaskArticle } from '../tasks/task-article.entity';
import { TaskTool } from '../tasks/task-tool.entity';
import { GanttFilterDto } from './dto/gantt-filter.dto';

@Injectable()
export class GanttService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskPersonnel)
    private readonly tpRepo: Repository<TaskPersonnel>,
    @InjectRepository(TaskArticle)
    private readonly taRepo: Repository<TaskArticle>,
    @InjectRepository(TaskTool)
    private readonly ttRepo: Repository<TaskTool>,
  ) {}

  async getGantt(tenantId: string, projectId: string, filters: GanttFilterDto) {
    // Verify project exists and belongs to tenant
    const project = await this.projectRepo.findOne({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundException({
        error: 'PROJECT_NOT_FOUND',
        message: `Project '${projectId}' not found`,
      });
    }

    // Build task query with filters
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    // Date overlap filter — task period overlaps [startDate, endDate]
    if (filters.startDate && filters.endDate) {
      qb.andWhere('t.start_date <= :endDate AND t.end_date >= :startDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      qb.andWhere('t.end_date >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      qb.andWhere('t.start_date <= :endDate', { endDate: filters.endDate });
    }

    // Personnel filter — only tasks that include this personnel
    if (filters.personnelId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM task_personnel tp
          WHERE tp.task_id = t.id AND tp.personnel_id = :personnelId
        )`,
        { personnelId: filters.personnelId },
      );
    }

    // Tool filter
    if (filters.toolId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM task_tools tt
          WHERE tt.task_id = t.id AND tt.tool_id = :toolId
        )`,
        { toolId: filters.toolId },
      );
    }

    // Article filter
    if (filters.articleId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM task_articles ta
          WHERE ta.task_id = t.id AND ta.article_id = :articleId
        )`,
        { articleId: filters.articleId },
      );
    }

    qb.orderBy('t.start_date', 'ASC');
    const tasks = await qb.getMany();

    // Enrich each task with its resources
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const [personnel, articles, tools] = await Promise.all([
          this.tpRepo.find({
            where: { taskId: task.id },
            relations: ['personnel'],
          }),
          this.taRepo.find({
            where: { taskId: task.id },
            relations: ['article'],
          }),
          this.ttRepo.find({
            where: { taskId: task.id },
            relations: ['tool'],
          }),
        ]);

        return {
          id: task.id,
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          status: task.status,
          progress: task.progress,
          estimatedCost: task.estimatedCost,
          currency: task.currency,
          personnel: personnel.map((tp) => ({
            id: tp.personnelId,
            fullName: tp.personnel?.fullName,
            role: tp.personnel?.role,
            quantity: tp.quantity,
            unitCost: tp.unitCost,
          })),
          tools: tools.map((tt) => ({
            id: tt.toolId,
            name: tt.tool?.name,
            category: tt.tool?.category,
            quantity: tt.quantity,
          })),
          articles: articles.map((ta) => ({
            id: ta.articleId,
            name: ta.article?.name,
            category: ta.article?.category,
            quantity: ta.quantity,
          })),
        };
      }),
    );

    return {
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        progress: project.progress,
        currency: project.currency,
      },
      tasks: enrichedTasks,
      meta: {
        totalTasks: enrichedTasks.length,
        filters: {
          startDate: filters.startDate ?? null,
          endDate: filters.endDate ?? null,
          personnelId: filters.personnelId ?? null,
          toolId: filters.toolId ?? null,
          articleId: filters.articleId ?? null,
        },
      },
    };
  }
}
