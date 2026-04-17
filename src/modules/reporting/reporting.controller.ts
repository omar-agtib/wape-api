import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { NonConformity } from '../non-conformities/non-conformity.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Article } from '../articles/article.entity';
import { Tool } from '../tools/tool.entity';
import { Personnel } from '../personnel/personnel.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { ProjectFinanceSnapshot } from '../projects/project-finance-snapshot.entity';
import { StockMovement } from '../stock/stock-movement.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  InvoiceStatus,
  NcStatus,
  ProjectStatus,
  TaskStatus,
  ToolStatus,
} from '../../common/enums';

@ApiTags('reporting')
@ApiBearerAuth('JWT')
@Controller('reporting')
export class ReportingController {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(NonConformity) private ncRepo: Repository<NonConformity>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(Tool) private toolRepo: Repository<Tool>,
    @InjectRepository(Personnel) private personnelRepo: Repository<Personnel>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(ProjectFinanceSnapshot)
    private snapshotRepo: Repository<ProjectFinanceSnapshot>,
    @InjectRepository(StockMovement)
    private stockRepo: Repository<StockMovement>,
  ) {}

  @Get('overview')
  @RequirePermission('reporting', 'R')
  @ApiOperation({ summary: 'KPIs globaux — tous les modules' })
  async overview(@CurrentUser() user: JwtPayload) {
    const { tenantId } = user;

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      tasksInProgress,
      completedTasks,
      totalPersonnel,
      totalTools,
      availableTools,
      inUseTools,
      totalArticles,
      openNcs,
      closedNcs,
      pendingInvoices,
      validatedInvoices,
      paidInvoices,
    ] = await Promise.all([
      this.projectRepo.count({ where: { tenantId } }),
      this.projectRepo.count({
        where: { tenantId, status: ProjectStatus.ON_PROGRESS },
      }),
      this.projectRepo.count({
        where: { tenantId, status: ProjectStatus.COMPLETED },
      }),
      this.taskRepo.count({ where: { tenantId } }),
      this.taskRepo.count({
        where: { tenantId, status: TaskStatus.ON_PROGRESS },
      }),
      this.taskRepo.count({
        where: { tenantId, status: TaskStatus.COMPLETED },
      }),
      this.personnelRepo.count({ where: { tenantId } }),
      this.toolRepo.count({ where: { tenantId } }),
      this.toolRepo.count({
        where: { tenantId, status: ToolStatus.AVAILABLE },
      }),
      this.toolRepo.count({ where: { tenantId, status: ToolStatus.IN_USE } }),
      this.articleRepo.count({ where: { tenantId } }),
      this.ncRepo.count({ where: { tenantId, status: NcStatus.OPEN } }),
      this.ncRepo.count({ where: { tenantId, status: NcStatus.CLOSED } }),
      this.invoiceRepo.count({
        where: { tenantId, status: InvoiceStatus.PENDING_VALIDATION },
      }),
      this.invoiceRepo.count({
        where: { tenantId, status: InvoiceStatus.VALIDATED },
      }),
      this.invoiceRepo.count({
        where: { tenantId, status: InvoiceStatus.PAID },
      }),
    ]);

    const stockAlerts = await this.articleRepo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.stock_quantity - a.reserved_quantity <= 0')
      .getCount();

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
      },
      tasks: {
        total: totalTasks,
        inProgress: tasksInProgress,
        completed: completedTasks,
      },
      personnel: { total: totalPersonnel },
      tools: {
        total: totalTools,
        available: availableTools,
        inUse: inUseTools,
      },
      articles: { total: totalArticles, stockAlerts },
      nonConformities: { open: openNcs, closed: closedNcs },
      invoices: {
        pending: pendingInvoices,
        validated: validatedInvoices,
        paid: paidInvoices,
      },
    };
  }

  @Get('projects')
  @RequirePermission('reporting', 'R')
  @ApiOperation({ summary: 'Santé de tous les projets — budget, tâches, NC' })
  async projectsHealth(@CurrentUser() user: JwtPayload) {
    const { tenantId } = user;
    const projects = await this.projectRepo.find({ where: { tenantId } });

    const result = await Promise.all(
      projects.map(async (p) => {
        const [taskCount, completedTasks, openNcs, snapshot] =
          await Promise.all([
            this.taskRepo.count({ where: { tenantId, projectId: p.id } }),
            this.taskRepo.count({
              where: {
                tenantId,
                projectId: p.id,
                status: TaskStatus.COMPLETED,
              },
            }),
            this.ncRepo.count({
              where: { tenantId, projectId: p.id, status: NcStatus.OPEN },
            }),
            this.snapshotRepo.findOne({ where: { projectId: p.id } }),
          ]);

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
          budget: p.budget,
          currency: p.currency,
          startDate: p.startDate,
          endDate: p.endDate,
          taskCount,
          completedTasks,
          taskCompletionRate:
            taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0,
          openNcs,
          finance: snapshot
            ? {
                totalBudget: snapshot.totalBudget,
                totalSpent: snapshot.totalSpent,
                remainingBudget: snapshot.remainingBudget,
                percentConsumed:
                  snapshot.totalBudget > 0
                    ? Math.round(
                        (snapshot.totalSpent / snapshot.totalBudget) * 10000,
                      ) / 100
                    : 0,
              }
            : null,
        };
      }),
    );

    return result;
  }

  @Get('tasks')
  @RequirePermission('reporting', 'R')
  @ApiOperation({ summary: 'Distribution des tâches par statut + coûts' })
  async tasksStats(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
  ) {
    const { tenantId } = user;

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId });
    if (projectId) qb.andWhere('t.project_id = :pid', { pid: projectId });

    const tasks = await qb.getMany();

    const byStatus = {
      planned: tasks.filter((t) => t.status === ('planned' as any)),
      on_progress: tasks.filter((t) => t.status === ('on_progress' as any)),
      completed: tasks.filter((t) => t.status === ('completed' as any)),
    };

    return {
      total: tasks.length,
      byStatus: Object.fromEntries(
        Object.entries(byStatus).map(([status, list]) => [
          status,
          {
            count: list.length,
            totalEstimatedCost: list.reduce(
              (s, t) => s + (t.estimatedCost ?? 0),
              0,
            ),
          },
        ]),
      ),
      totalEstimatedCost: tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0),
    };
  }

  @Get('non-conformities')
  @RequirePermission('reporting', 'R')
  @ApiOperation({ summary: 'Non-conformités par statut et par projet' })
  async ncStats(@CurrentUser() user: JwtPayload) {
    const { tenantId } = user;
    const ncs = await this.ncRepo.find({ where: { tenantId } });

    return {
      total: ncs.length,
      byStatus: {
        open: ncs.filter((nc) => nc.status === NcStatus.OPEN).length,
        in_review: ncs.filter((nc) => nc.status === NcStatus.IN_REVIEW).length,
        closed: ncs.filter((nc) => nc.status === NcStatus.CLOSED).length,
      },
      byProject: Object.entries(
        ncs.reduce<Record<string, number>>((acc, nc) => {
          acc[nc.projectId] = (acc[nc.projectId] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([projectId, count]) => ({ projectId, count })),
    };
  }

  @Get('finance')
  @RequirePermission('reporting', 'R')
  @ApiOperation({
    summary: 'Résumé financier — transactions par type, par mois',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Nombre de mois (défaut: 6)',
  })
  async financeStats(
    @CurrentUser() user: JwtPayload,
    @Query('months') months = '6',
  ) {
    const { tenantId } = user;
    const monthsInt = Math.min(parseInt(months), 12);

    const transactions = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.tenant_id = :tenantId', { tenantId })
      .andWhere('tx.status = :status', { status: 'success' })
      .andWhere(`tx.payment_date >= NOW() - INTERVAL '${monthsInt} months'`)
      .getMany();

    const byMonth: Record<string, number> = {};
    transactions.forEach((tx) => {
      const month = tx.paymentDate.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + tx.amount;
    });

    const byType = {
      subscription: transactions
        .filter((tx) => tx.paymentType === ('subscription' as any))
        .reduce((s, tx) => s + tx.amount, 0),
      supplier: transactions
        .filter((tx) => tx.paymentType === ('supplier' as any))
        .reduce((s, tx) => s + tx.amount, 0),
      subcontractor: transactions
        .filter((tx) => tx.paymentType === ('subcontractor' as any))
        .reduce((s, tx) => s + tx.amount, 0),
    };

    return {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((s, tx) => s + tx.amount, 0),
      byType,
      monthlyChart: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total })),
    };
  }

  @Get('stock')
  @RequirePermission('reporting', 'R')
  @ApiOperation({ summary: 'Résumé stock — alertes, articles critiques' })
  async stockStats(@CurrentUser() user: JwtPayload) {
    const { tenantId } = user;
    const articles = await this.articleRepo.find({ where: { tenantId } });

    const alerts = articles.filter((a) => {
      const available = a.stockQuantity - a.reservedQuantity;
      return available <= (a.minimumStock ?? 0);
    });

    return {
      totalArticles: articles.length,
      alertsCount: alerts.length,
      alerts: alerts.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        stockQuantity: a.stockQuantity,
        reservedQuantity: a.reservedQuantity,
        availableQuantity: a.stockQuantity - a.reservedQuantity,
        minimumStock: a.minimumStock ?? 0,
      })),
      totalStockValue: articles.reduce(
        (s, a) => s + a.stockQuantity * a.unitPrice,
        0,
      ),
    };
  }
}
