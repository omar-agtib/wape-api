import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
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
import { TaskStatus } from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';
import {
  createMockRealtimeService,
  createMockMailService,
  createMockQueryRunner,
} from '../../test/helpers/mock-services';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { MailService } from '../../shared/mail/mail.service';

type TaskErrorResponse =
  | { error: 'INVALID_STATUS_TRANSITION'; details?: Record<string, any> }
  | { error: 'INSUFFICIENT_STOCK'; details: { insufficientArticles: any[] } }
  | { error: 'RG01'; details?: Record<string, any> };

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: ReturnType<typeof createMockRepository>;
  let tpRepo: ReturnType<typeof createMockRepository>;
  let taRepo: ReturnType<typeof createMockRepository>;
  let ttRepo: ReturnType<typeof createMockRepository>;
  let articleRepo: ReturnType<typeof createMockRepository>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>;
  const tenantId = 'tenant-uuid';

  const mockTask = {
    id: 'task-uuid',
    tenantId,
    projectId: 'project-uuid',
    name: 'Fondations Bloc A',
    startDate: '2026-04-01',
    endDate: '2026-05-15',
    status: TaskStatus.PLANNED,
    progress: 0,
    estimatedCost: 0,
    currency: 'MAD',
  };

  const mockArticle = {
    id: 'article-uuid',
    name: 'Ciment Portland',
    stockQuantity: 500,
    reservedQuantity: 0,
    unitPrice: 85,
    currency: 'MAD',
  };

  beforeEach(async () => {
    taskRepo = createMockRepository();
    tpRepo = createMockRepository();
    taRepo = createMockRepository();
    ttRepo = createMockRepository();
    articleRepo = createMockRepository();
    mockQueryRunner = createMockQueryRunner();
    mockQueryRunner.manager.save.mockResolvedValue({});
    mockQueryRunner.manager.update.mockResolvedValue(undefined);
    mockQueryRunner.manager.increment.mockResolvedValue(undefined);
    mockQueryRunner.manager.findOne.mockResolvedValue(undefined);

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockProjectsService: Partial<ProjectsService> = {
      findOneRaw: jest.fn().mockResolvedValue({
        id: 'project-uuid',
        name: 'Test Project',
        tenantId,
      }),
      recalculateFromTasks: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TaskPersonnel), useValue: tpRepo },
        { provide: getRepositoryToken(TaskArticle), useValue: taRepo },
        { provide: getRepositoryToken(TaskTool), useValue: ttRepo },
        {
          provide: getRepositoryToken(Personnel),
          useValue: createMockRepository(),
        },
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        { provide: getRepositoryToken(Tool), useValue: createMockRepository() },
        {
          provide: ArticlesService,
          useValue: {
            findOneRaw: jest.fn().mockResolvedValue(mockArticle),
            reserveStock: jest.fn().mockResolvedValue(undefined),
            consumeStock: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ToolsService,
          useValue: {
            findOneRaw: jest
              .fn()
              .mockResolvedValue({ id: 'tool-uuid', status: 'available' }),
            autoOut: jest.fn().mockResolvedValue(undefined),
            autoIn: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: StockService,
          useValue: { createMovement: jest.fn().mockResolvedValue({}) },
        },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: RealtimeService, useValue: createMockRealtimeService() },
        { provide: MailService, useValue: createMockMailService() },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates task with planned status', async () => {
      taskRepo.create!.mockReturnValue(mockTask);
      taskRepo.save!.mockResolvedValue(mockTask);

      const result = await service.create(tenantId, {
        projectId: 'project-uuid',
        name: 'Fondations',
        startDate: '2026-04-01',
        endDate: '2026-05-15',
        currency: 'MAD',
      });

      expect(result.status).toBe(TaskStatus.PLANNED);
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.PLANNED, progress: 0 }),
      );
    });

    it('throws RG01 when endDate < startDate', async () => {
      await expect(
        service.create(tenantId, {
          projectId: 'project-uuid',
          name: 'Bad Task',
          startDate: '2026-12-01',
          endDate: '2026-01-01',
          currency: 'MAD',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows same start and end date (tasks allow equal dates)', async () => {
      taskRepo.create!.mockReturnValue(mockTask);
      taskRepo.save!.mockResolvedValue(mockTask);

      await expect(
        service.create(tenantId, {
          projectId: 'project-uuid',
          name: 'One Day Task',
          startDate: '2026-04-01',
          endDate: '2026-04-01',
          currency: 'MAD',
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── changeStatus ────────────────────────────────────────────────────────────

  describe('changeStatus', () => {
    // Helper: sets up all mocks needed for a status transition
    function setupMocksForTransition(
      currentStatus: TaskStatus,
      articleQuantity = 50,
      articleStock = 500,
      articleReserved = 0,
    ) {
      const task = { ...mockTask, status: currentStatus };
      taskRepo.findOne!.mockResolvedValue(task);
      taRepo.find!.mockResolvedValue(
        articleQuantity > 0
          ? [
              {
                taskId: 'task-uuid',
                articleId: 'article-uuid',
                quantity: articleQuantity,
              },
            ]
          : [],
      );
      ttRepo.find!.mockResolvedValue([]);
      articleRepo.findOne!.mockResolvedValue({
        ...mockArticle,
        stockQuantity: articleStock,
        reservedQuantity: articleReserved,
        consumedQuantity: 0,
      });
    }

    it('validates planned → on_progress transition is allowed', async () => {
      const onProgressTask = { ...mockTask, status: TaskStatus.ON_PROGRESS };
      setupMocksForTransition(TaskStatus.PLANNED);
      taskRepo.save!.mockResolvedValue(onProgressTask);
      taskRepo.find!.mockResolvedValue([onProgressTask]);

      const result = await service.changeStatus(
        tenantId,
        'task-uuid',
        TaskStatus.ON_PROGRESS,
      );
      expect(result.status).toBe(TaskStatus.ON_PROGRESS);
    });

    it('throws INVALID_STATUS_TRANSITION for completed → planned', async () => {
      taskRepo.findOne!.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });
      taRepo.find!.mockResolvedValue([]);
      ttRepo.find!.mockResolvedValue([]);

      await expect(
        service.changeStatus(tenantId, 'task-uuid', TaskStatus.PLANNED),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws INVALID_STATUS_TRANSITION for planned → completed (skipping on_progress)', async () => {
      taskRepo.findOne!.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PLANNED,
      });
      taRepo.find!.mockResolvedValue([]);
      ttRepo.find!.mockResolvedValue([]);

      let caughtError: UnprocessableEntityException | undefined;
      try {
        await service.changeStatus(tenantId, 'task-uuid', TaskStatus.COMPLETED);
      } catch (e) {
        caughtError = e as UnprocessableEntityException;
      }
      expect(caughtError).toBeDefined();
      const response = caughtError!.getResponse() as TaskErrorResponse;
      expect(response.error).toBe('INVALID_STATUS_TRANSITION');
    });

    it('throws INVALID_STATUS_TRANSITION for on_progress → planned (regression)', async () => {
      taskRepo.findOne!.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.ON_PROGRESS,
      });
      taRepo.find!.mockResolvedValue([]);
      ttRepo.find!.mockResolvedValue([]);

      await expect(
        service.changeStatus(tenantId, 'task-uuid', TaskStatus.PLANNED),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws INSUFFICIENT_STOCK (RG02) when article stock is insufficient', async () => {
      // 9999 requested, only 100 available
      setupMocksForTransition(TaskStatus.PLANNED, 9999, 100, 0);

      let caughtError: UnprocessableEntityException | undefined;
      try {
        await service.changeStatus(
          tenantId,
          'task-uuid',
          TaskStatus.ON_PROGRESS,
        );
      } catch (e) {
        caughtError = e as UnprocessableEntityException;
      }

      expect(caughtError).toBeDefined();
      const response = caughtError!.getResponse() as TaskErrorResponse;
      expect(response.error).toBe('INSUFFICIENT_STOCK');
      expect(response.details?.insufficientArticles).toEqual([
        {
          articleId: 'article-uuid',
          required: 9999,
          available: 100,
        },
      ]);
    });

    it('sets progress to 100 when completing task', async () => {
      const onProgressTask = { ...mockTask, status: TaskStatus.ON_PROGRESS };
      const completedTask = {
        ...onProgressTask,
        status: TaskStatus.COMPLETED,
        progress: 100,
      };

      taskRepo.findOne!.mockResolvedValue(onProgressTask);
      taRepo.find!.mockResolvedValue([
        { articleId: 'article-uuid', quantity: 50 },
      ]);
      ttRepo.find!.mockResolvedValue([]);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockArticle,
        stockQuantity: 500,
        reservedQuantity: 50,
        consumedQuantity: 0,
      });
      taskRepo.save!.mockResolvedValue(completedTask);
      taskRepo.find!.mockResolvedValue([completedTask]);

      const result = await service.changeStatus(
        tenantId,
        'task-uuid',
        TaskStatus.COMPLETED,
      );
      expect(result.progress).toBe(100);
    });

    it('throws NotFoundException for unknown task', async () => {
      taskRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.changeStatus(tenantId, 'unknown-uuid', TaskStatus.ON_PROGRESS),
      ).rejects.toThrow(NotFoundException);
    });

    it('rolls back transaction on W1 DB failure', async () => {
      taskRepo.findOne!.mockResolvedValue(mockTask);
      taRepo.find!.mockResolvedValue([
        { taskId: 'task-uuid', articleId: 'article-uuid', quantity: 50 },
      ]);
      ttRepo.find!.mockResolvedValue([]);
      articleRepo.findOne!.mockResolvedValue({
        ...mockArticle,
        stockQuantity: 500,
        reservedQuantity: 0,
      });

      // Force the queryRunner to fail mid-transaction
      mockQueryRunner.manager.increment.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );

      await expect(
        service.changeStatus(tenantId, 'task-uuid', TaskStatus.ON_PROGRESS),
      ).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ── addPersonnel ─────────────────────────────────────────────────────────────

  describe('addPersonnel', () => {
    it('pre-fills unitCost from personnel.costPerHour', async () => {
      const personnel = {
        id: 'p-uuid',
        tenantId,
        costPerHour: 150,
        currency: 'MAD',
      };

      taskRepo.findOne!.mockResolvedValue(mockTask);

      // Override the personnelRepo directly on the service instance
      (service as unknown as { personnelRepo: any }).personnelRepo = {
        findOne: jest.fn().mockResolvedValue(personnel),
      };

      const saved = {
        id: 'tp-uuid',
        taskId: 'task-uuid',
        personnelId: 'p-uuid',
        quantity: 40,
        unitCost: 150,
        currency: 'MAD',
        totalCost: 6000,
      };

      tpRepo.create!.mockReturnValue(saved);
      tpRepo.save!.mockResolvedValue(saved);

      // Mock all find calls for recalcCost
      tpRepo.find!.mockResolvedValue([saved]);
      taRepo.find!.mockResolvedValue([]);
      ttRepo.find!.mockResolvedValue([]);
      taskRepo.update!.mockResolvedValue(undefined);

      const result = await service.addPersonnel(tenantId, 'task-uuid', {
        personnelId: 'p-uuid',
        quantity: 40,
        // unitCost NOT provided — should be auto-filled from personnel
      });

      expect(result.unitCost).toBe(150);
      expect(result.totalCost).toBe(6000);
    });
  });
});
