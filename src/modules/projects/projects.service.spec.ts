import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './project.entity';
import { ProjectFinanceSnapshot } from './project-finance-snapshot.entity';
import { ProjectStatus } from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';
import { createMockRealtimeService } from '../../test/helpers/mock-services';
import { RealtimeService } from '../../shared/realtime/realtime.service';

type FieldErrorResponse = {
  error: string;
  field: string;
  [key: string]: any; // optional extra fields
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepo: ReturnType<typeof createMockRepository>;
  let snapshotRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';

  const mockProject = {
    id: 'project-uuid',
    tenantId,
    name: 'Résidence Atlas',
    budget: 2500000,
    currency: 'MAD',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    status: ProjectStatus.PLANNED,
    progress: 0,
    createdBy: userId,
  };

  beforeEach(async () => {
    projectRepo = createMockRepository();
    snapshotRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        {
          provide: getRepositoryToken(ProjectFinanceSnapshot),
          useValue: snapshotRepo,
        },
        { provide: RealtimeService, useValue: createMockRealtimeService() },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      name: 'Résidence Atlas',
      budget: 2500000,
      currency: 'MAD',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
    };

    it('creates project and finance snapshot', async () => {
      projectRepo.create!.mockReturnValue(mockProject);
      projectRepo.save!.mockResolvedValue(mockProject);
      snapshotRepo.create!.mockReturnValue({});
      snapshotRepo.save!.mockResolvedValue({});

      const result = await service.create(tenantId, userId, dto);

      expect(projectRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Résidence Atlas',
          status: ProjectStatus.PLANNED,
          progress: 0,
        }),
      );
      expect(snapshotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalBudget: 2500000,
          totalSpent: 0,
          remainingBudget: 2500000,
        }),
      );
      expect(result).toEqual(mockProject);
    });

    it('throws RG01 when endDate <= startDate', async () => {
      await expect(
        service.create(tenantId, userId, {
          ...dto,
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        service.create(tenantId, userId, {
          ...dto,
          startDate: '2026-06-01',
          endDate: '2026-06-01', // same date
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws RG01 with correct error code', async () => {
      try {
        await service.create(tenantId, userId, {
          ...dto,
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        });
      } catch (e: any) {
        const response = (
          e as HttpException
        ).getResponse() as FieldErrorResponse;

        expect(response.error).toBe('INVALID_DATE_RANGE');
        expect(response.field).toBe('endDate');
      }
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns project with snapshot', async () => {
      const snapshot = { totalBudget: 2500000, totalSpent: 0 };
      projectRepo.findOne!.mockResolvedValue(mockProject);
      snapshotRepo.findOne!.mockResolvedValue(snapshot);

      const result = await service.findOne(tenantId, 'project-uuid');

      expect(result).toMatchObject({
        ...mockProject,
        financeSnapshot: snapshot,
      });
    });

    it('throws NotFoundException for unknown id', async () => {
      projectRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NOT_FOUND with correct error code', async () => {
      projectRepo.findOne!.mockResolvedValue(null);

      try {
        await service.findOne(tenantId, 'unknown-id');
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as {
          error: string;
        };
        expect(response.error).toBe('PROJECT_NOT_FOUND');
      }
    });
  });

  // ── getFinance ──────────────────────────────────────────────────────────────

  describe('getFinance', () => {
    it('returns normal alert level when < 80%', async () => {
      projectRepo.findOne!.mockResolvedValue({
        ...mockProject,
        budget: 2500000,
      });
      snapshotRepo.findOne!.mockResolvedValue({
        totalBudget: 2500000,
        totalSpent: 1000000,
        remainingBudget: 1500000,
        spentPersonnel: 500000,
        spentArticles: 300000,
        spentTools: 200000,
        lastUpdatedAt: new Date(),
      });

      const result = await service.getFinance(tenantId, 'project-uuid');

      expect(result.percentConsumed).toBe(40);
      expect(result.alertLevel).toBe('normal');
    });

    it('returns warning alert level when 80-99%', async () => {
      projectRepo.findOne!.mockResolvedValue({
        ...mockProject,
        budget: 100000,
      });
      snapshotRepo.findOne!.mockResolvedValue({
        totalBudget: 100000,
        totalSpent: 85000,
        remainingBudget: 15000,
        spentPersonnel: 0,
        spentArticles: 0,
        spentTools: 0,
        lastUpdatedAt: new Date(),
      });

      const result = await service.getFinance(tenantId, 'project-uuid');

      expect(result.alertLevel).toBe('warning');
    });

    it('returns critical alert level when >= 100%', async () => {
      projectRepo.findOne!.mockResolvedValue({
        ...mockProject,
        budget: 100000,
      });
      snapshotRepo.findOne!.mockResolvedValue({
        totalBudget: 100000,
        totalSpent: 105000,
        remainingBudget: -5000,
        spentPersonnel: 0,
        spentArticles: 0,
        spentTools: 0,
        lastUpdatedAt: new Date(),
      });

      const result = await service.getFinance(tenantId, 'project-uuid');

      expect(result.alertLevel).toBe('critical');
      expect(result.percentConsumed).toBe(105);
    });
  });
});
