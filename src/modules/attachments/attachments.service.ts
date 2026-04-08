import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Attachment } from './attachment.entity';
import { AttachmentTask } from './attachment-task.entity';
import { ProjectFinanceSnapshot } from '../projects/project-finance-snapshot.entity';
import { ContactsService } from '../contacts/contacts.service';
import { TasksService } from '../tasks/tasks.service';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { ConfirmAttachmentDto } from './dto/confirm-attachment.dto';
import { AttachmentFilterDto } from './dto/attachment-filter.dto';
import { MailService } from '../../shared/mail/mail.service';
import { ProjectsService } from '../projects/projects.service';
import {
  AttachmentStatus,
  AttachmentType,
  ContactType,
  TaskStatus,
} from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { RealtimeService } from '../../shared/realtime/realtime.service';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachRepo: Repository<Attachment>,
    @InjectRepository(AttachmentTask)
    private readonly atRepo: Repository<AttachmentTask>,
    @InjectRepository(ProjectFinanceSnapshot)
    private readonly snapshotRepo: Repository<ProjectFinanceSnapshot>,
    private readonly contactsService: ContactsService,
    private readonly tasksService: TasksService,
    private readonly invoicesService: InvoicesService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly projectsService: ProjectsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    dto: CreateAttachmentDto,
  ): Promise<Attachment> {
    // Validate subcontractor type if provided (RG09)
    if (dto.subcontractorId) {
      await this.contactsService.verifyType(
        tenantId,
        dto.subcontractorId,
        ContactType.SUBCONTRACTOR,
      );
    }

    // RG03 — all tasks must be completed
    // RG18 — no task already in a confirmed attachment
    await this.validateTasks(tenantId, dto.taskIds);

    const attachment = this.attachRepo.create({
      tenantId,
      projectId: dto.projectId,
      subcontractorId: dto.subcontractorId,
      title: dto.title,
      currency: dto.currency,
      status: AttachmentStatus.DRAFT,
      attachmentType: dto.subcontractorId
        ? AttachmentType.EXTERNAL
        : AttachmentType.INTERNAL,
      personnelCost: 0,
      articlesCost: 0,
      toolsCost: 0,
      totalCost: 0,
      createdBy: userId,
    });

    const saved = await this.attachRepo.save(attachment);

    // Create attachment_task rows
    const atRows = dto.taskIds.map((taskId) =>
      this.atRepo.create({ attachmentId: saved.id, taskId }),
    );
    await this.atRepo.save(atRows);

    return saved;
  }

  // ── Find ────────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    filters: AttachmentFilterDto,
  ): Promise<PaginatedResult<Attachment>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.attachRepo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.deleted_at IS NULL');

    if (filters.status)
      qb.andWhere('a.status = :status', { status: filters.status });
    if (filters.projectId)
      qb.andWhere('a.project_id = :pid', { pid: filters.projectId });
    if (filters.subcontractorId)
      qb.andWhere('a.subcontractor_id = :sid', {
        sid: filters.subcontractorId,
      });

    qb.orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const attachment = await this.findOneRaw(tenantId, id);
    const tasks = await this.atRepo.find({ where: { attachmentId: id } });
    return { ...attachment, taskIds: tasks.map((t) => t.taskId) };
  }

  async findByProject(
    tenantId: string,
    projectId: string,
  ): Promise<Attachment[]> {
    return this.attachRepo.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Confirm (W7) ─────────────────────────────────────────────────────────────

  async confirm(
    tenantId: string,
    id: string,
    userId: string,
    dto: ConfirmAttachmentDto,
  ) {
    const attachment = await this.findOneRaw(tenantId, id);

    if (attachment.status !== AttachmentStatus.DRAFT) {
      throw new UnprocessableEntityException({
        error: 'ATTACHMENT_NOT_DRAFT',
        message: `Attachment is already ${attachment.status} and cannot be confirmed again`,
        details: { currentStatus: attachment.status },
      });
    }

    // Step 2 — calculate costs (user override or sum from tasks)
    const costs = await this.calculateCosts(id, dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let invoice: Awaited<
      ReturnType<typeof this.invoicesService.createFromAttachment>
    > | null = null;

    try {
      // Step 3 — update attachment
      const isExternal = !!attachment.subcontractorId;
      const newStatus = isExternal
        ? AttachmentStatus.INVOICED
        : AttachmentStatus.CONFIRMED;

      await queryRunner.manager.update(Attachment, id, {
        personnelCost: costs.personnelCost,
        articlesCost: costs.articlesCost,
        toolsCost: costs.toolsCost,
        totalCost: costs.totalCost,
        attachmentType: isExternal
          ? AttachmentType.EXTERNAL
          : AttachmentType.INTERNAL,
        status: newStatus,
        confirmedAt: new Date(),
        confirmedBy: userId,
      });

      // Step 4 — update finance snapshot (always, regardless of internal/external)
      const snapshot = await this.snapshotRepo.findOne({
        where: { projectId: attachment.projectId },
      });
      if (snapshot) {
        await queryRunner.manager.update(ProjectFinanceSnapshot, snapshot.id, {
          totalSpent: snapshot.totalSpent + costs.totalCost,
          remainingBudget: snapshot.remainingBudget - costs.totalCost,
          spentPersonnel: snapshot.spentPersonnel + costs.personnelCost,
          spentArticles: snapshot.spentArticles + costs.articlesCost,
          spentTools: snapshot.spentTools + costs.toolsCost,
          lastUpdatedAt: new Date(),
        });
      }

      await queryRunner.commitTransaction();
      const updatedSnapshot = await this.snapshotRepo.findOne({
        where: { projectId: attachment.projectId },
      });
      if (updatedSnapshot) {
        const percentConsumed =
          updatedSnapshot.totalBudget > 0
            ? Math.round(
                (updatedSnapshot.totalSpent / updatedSnapshot.totalBudget) *
                  10000,
              ) / 100
            : 0;
        const alertLevel =
          percentConsumed >= 100
            ? 'critical'
            : percentConsumed >= 80
              ? 'warning'
              : 'normal';

        this.realtimeService.emitFinanceUpdated(tenantId, {
          projectId: attachment.projectId,
          projectName: attachment.title, // production: fetch project name
          totalBudget: updatedSnapshot.totalBudget,
          totalSpent: updatedSnapshot.totalSpent,
          remainingBudget: updatedSnapshot.remainingBudget,
          percentConsumed,
          alertLevel,
          currency: attachment.currency,
          breakdown: {
            personnel: updatedSnapshot.spentPersonnel,
            articles: updatedSnapshot.spentArticles,
            tools: updatedSnapshot.spentTools,
          },
        });
      }
      void this.checkBudgetAlert(tenantId, attachment.projectId, []); // ← async check for budget alert (non-blocking)

      // Step 5a — if external: create invoice (outside transaction is fine)
      if (isExternal) {
        invoice = await this.invoicesService.createFromAttachment({
          tenantId,
          attachmentId: id,
          subcontractorId: attachment.subcontractorId!,
          projectId: attachment.projectId,
          amount: costs.totalCost,
          currency: attachment.currency,
        });
      }

      if (isExternal && invoice) {
        try {
          const project = await this.projectsService.findOneRaw(
            tenantId,
            attachment.projectId,
          );
          const subcontractor = await this.contactsService.findOneRaw(
            tenantId,
            attachment.subcontractorId!,
          );
          await this.mailService.sendInvoiceCreated(
            [subcontractor.email].filter(Boolean) as string[],
            {
              invoiceNumber: invoice.invoiceNumber,
              invoiceId: invoice.id,
              subcontractorName: subcontractor.legalName,
              projectName: project.name,
              amount: invoice.amount,
              currency: invoice.currency,
              issuedAt: new Date().toLocaleDateString('fr-MA'),
            },
          );
        } catch {
          /* non-fatal */
        }

        this.realtimeService.emitInvoiceCreated(tenantId, {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          projectId: attachment.projectId,
          projectName: attachment.title,
          subcontractorName: attachment.subcontractorId ?? '',
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
        });
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const updated = await this.findOneRaw(tenantId, id);
    return {
      attachment: updated,
      ...(invoice && { invoice }),
      message: invoice
        ? `Attachment confirmed. Invoice ${invoice.invoiceNumber} created automatically.`
        : 'Attachment confirmed as internal (no invoice created).',
    };
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<Attachment> {
    const a = await this.attachRepo.findOne({ where: { id, tenantId } });
    if (!a)
      throw new NotFoundException({
        error: 'ATTACHMENT_NOT_FOUND',
        message: `Attachment '${id}' not found`,
      });
    return a;
  }

  private async validateTasks(
    tenantId: string,
    taskIds: string[],
  ): Promise<void> {
    for (const taskId of taskIds) {
      // RG03 — task must be completed
      const task = await this.tasksService.findOneRaw(tenantId, taskId);
      if (task.status !== TaskStatus.COMPLETED) {
        throw new UnprocessableEntityException({
          error: 'TASK_NOT_COMPLETED',
          message: `Task '${task.name}' must be completed before adding to an attachment (current: ${task.status})`,
          field: 'taskIds',
          details: { taskId, taskName: task.name, currentStatus: task.status },
        });
      }

      // RG18 — task must not already be in a confirmed attachment
      const existingAt = await this.atRepo
        .createQueryBuilder('at')
        .innerJoin(Attachment, 'a', 'a.id = at.attachment_id')
        .where('at.task_id = :taskId', { taskId })
        .andWhere('a.status IN (:...statuses)', {
          statuses: [AttachmentStatus.CONFIRMED, AttachmentStatus.INVOICED],
        })
        .getOne();

      if (existingAt) {
        throw new UnprocessableEntityException({
          error: 'TASK_ALREADY_ATTACHED',
          message: `Task '${taskId}' is already included in a confirmed attachment`,
          field: 'taskIds',
          details: { taskId, conflictingAttachmentId: existingAt.attachmentId },
        });
      }
    }
  }

  private async calculateCosts(
    attachmentId: string,
    dto: ConfirmAttachmentDto,
  ): Promise<{
    personnelCost: number;
    articlesCost: number;
    toolsCost: number;
    totalCost: number;
  }> {
    // Get all tasks in this attachment
    const atRows = await this.atRepo.find({ where: { attachmentId } });
    const taskIds = atRows.map((r) => r.taskId);

    let personnelCost = dto.personnelCost ?? 0;
    let articlesCost = dto.articlesCost ?? 0;
    let toolsCost = dto.toolsCost ?? 0;

    // Auto-compute from task resources if not overridden
    if (
      dto.personnelCost === undefined ||
      dto.articlesCost === undefined ||
      dto.toolsCost === undefined
    ) {
      const result = await this.attachRepo.manager
        .createQueryBuilder()
        .select([
          'COALESCE(SUM(tp.total_cost), 0) AS personnel',
          'COALESCE(SUM(ta.total_cost), 0) AS articles',
          'COALESCE(SUM(tt.total_cost), 0) AS tools',
        ])
        .from('tasks', 't')
        .leftJoin('task_personnel', 'tp', 'tp.task_id = t.id')
        .leftJoin('task_articles', 'ta', 'ta.task_id = t.id')
        .leftJoin('task_tools', 'tt', 'tt.task_id = t.id')
        .where('t.id IN (:...taskIds)', {
          taskIds: taskIds.length > 0 ? taskIds : ['__none__'],
        })
        .getRawOne<{ personnel: string; articles: string; tools: string }>();

      if (dto.personnelCost === undefined)
        personnelCost = parseFloat(result?.personnel ?? '0');
      if (dto.articlesCost === undefined)
        articlesCost = parseFloat(result?.articles ?? '0');
      if (dto.toolsCost === undefined)
        toolsCost = parseFloat(result?.tools ?? '0');
    }

    return {
      personnelCost,
      articlesCost,
      toolsCost,
      totalCost: personnelCost + articlesCost + toolsCost,
    };
  }

  private async checkBudgetAlert(
    tenantId: string,
    projectId: string,
    adminEmails: string[],
  ): Promise<void> {
    try {
      const finance = await this.projectsService.getFinance(
        tenantId,
        projectId,
      );
      if (
        finance.alertLevel === 'warning' ||
        finance.alertLevel === 'critical'
      ) {
        await this.mailService.sendBudgetAlert(adminEmails, {
          projectId,
          projectName: finance.projectName,
          totalBudget: finance.totalBudget,
          totalSpent: finance.totalSpent,
          remainingBudget: finance.remainingBudget,
          percentConsumed: finance.percentConsumed,
          currency: finance.currency,
          alertLevel: finance.alertLevel,
        });
      }
    } catch {
      /* non-fatal */
    }
  }
}
