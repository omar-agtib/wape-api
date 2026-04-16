import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnprocessableEntityException, HttpException } from '@nestjs/common';
import { NonConformitiesService } from './non-conformities.service';
import { NonConformity } from './non-conformity.entity';
import { NcImage } from './nc-image.entity';
import { Plan } from '../plans/plan.entity';
import { NcStatus } from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';
import {
  createMockMailService,
  createMockRealtimeService,
} from '../../test/helpers/mock-services';
import { MailService } from '../../shared/mail/mail.service';
import { RealtimeService } from '../../shared/realtime/realtime.service';

type NcStatusErrorResponse = {
  error: string;
  details: {
    current: NcStatus;
    allowed: NcStatus[];
    [key: string]: any;
  };
};

describe('NonConformitiesService', () => {
  let service: NonConformitiesService;
  let ncRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';

  const mockNc = {
    id: 'nc-uuid',
    tenantId,
    projectId: 'project-uuid',
    title: 'Fissure murale',
    description: 'Fissure horizontale 2cm',
    status: NcStatus.OPEN,
    reportedBy: userId,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    ncRepo = createMockRepository();
    const imageRepo = createMockRepository();
    const planRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonConformitiesService,
        { provide: getRepositoryToken(NonConformity), useValue: ncRepo },
        { provide: getRepositoryToken(NcImage), useValue: imageRepo },
        { provide: getRepositoryToken(Plan), useValue: planRepo },
        { provide: MailService, useValue: createMockMailService() },
        { provide: RealtimeService, useValue: createMockRealtimeService() },
      ],
    }).compile();

    service = module.get<NonConformitiesService>(NonConformitiesService);
  });

  // ── Status transitions ───────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('allows open → in_review', async () => {
      ncRepo.findOne!.mockResolvedValue(mockNc);
      ncRepo.update!.mockResolvedValue(undefined);
      ncRepo
        .findOne!.mockResolvedValueOnce(mockNc)
        .mockResolvedValueOnce({ ...mockNc, status: NcStatus.IN_REVIEW });

      const result = await service.updateStatus(tenantId, 'nc-uuid', {
        status: NcStatus.IN_REVIEW,
      });

      expect(result.status).toBe(NcStatus.IN_REVIEW);
    });

    it('allows in_review → closed', async () => {
      ncRepo.findOne!.mockResolvedValue({
        ...mockNc,
        status: NcStatus.IN_REVIEW,
      });
      ncRepo.update!.mockResolvedValue(undefined);
      ncRepo
        .findOne!.mockResolvedValueOnce({
          ...mockNc,
          status: NcStatus.IN_REVIEW,
        })
        .mockResolvedValueOnce({ ...mockNc, status: NcStatus.CLOSED });

      const result = await service.updateStatus(tenantId, 'nc-uuid', {
        status: NcStatus.CLOSED,
      });

      expect(result.status).toBe(NcStatus.CLOSED);
    });

    it('allows open → closed (direct)', async () => {
      ncRepo.findOne!.mockResolvedValue(mockNc);
      ncRepo.update!.mockResolvedValue(undefined);
      ncRepo
        .findOne!.mockResolvedValueOnce(mockNc)
        .mockResolvedValueOnce({ ...mockNc, status: NcStatus.CLOSED });

      await expect(
        service.updateStatus(tenantId, 'nc-uuid', { status: NcStatus.CLOSED }),
      ).resolves.not.toThrow();
    });

    it('allows in_review → open (reversible)', async () => {
      ncRepo.findOne!.mockResolvedValue({
        ...mockNc,
        status: NcStatus.IN_REVIEW,
      });
      ncRepo.update!.mockResolvedValue(undefined);
      ncRepo
        .findOne!.mockResolvedValueOnce({
          ...mockNc,
          status: NcStatus.IN_REVIEW,
        })
        .mockResolvedValueOnce(mockNc);

      await expect(
        service.updateStatus(tenantId, 'nc-uuid', { status: NcStatus.OPEN }),
      ).resolves.not.toThrow();
    });

    it('throws INVALID_NC_STATUS_TRANSITION when closed → open', async () => {
      ncRepo.findOne!.mockResolvedValue({ ...mockNc, status: NcStatus.CLOSED });

      await expect(
        service.updateStatus(tenantId, 'nc-uuid', { status: NcStatus.OPEN }),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        ncRepo.findOne!.mockResolvedValue({
          ...mockNc,
          status: NcStatus.CLOSED,
        });
        await service.updateStatus(tenantId, 'nc-uuid', {
          status: NcStatus.OPEN,
        });
      } catch (e: any) {
        const response = (
          e as HttpException
        ).getResponse() as NcStatusErrorResponse;

        expect(response.error).toBe('INVALID_NC_STATUS_TRANSITION');
        expect(response.details.current).toBe(NcStatus.CLOSED);
        expect(response.details.allowed).toEqual([]);
      }
    });

    it('throws when closed → in_review', async () => {
      ncRepo.findOne!.mockResolvedValue({ ...mockNc, status: NcStatus.CLOSED });

      await expect(
        service.updateStatus(tenantId, 'nc-uuid', {
          status: NcStatus.IN_REVIEW,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
