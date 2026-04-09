import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { Tool } from './tool.entity';
import { ToolMovement } from './tool-movement.entity';
import { ToolStatus } from '../../common/enums';
import { MovementDirection } from './dto/tool-movement.dto';
import { createMockRepository } from '../../test/helpers/mock-repository';

type ToolErrorResponse = {
  error: 'TOOL_NOT_AVAILABLE' | 'TOOL_NOT_IN_USE' | 'TOOL_RETIRED';
  details?: Record<string, any>;
};

describe('ToolsService', () => {
  let service: ToolsService;
  let toolRepo: ReturnType<typeof createMockRepository>;
  let movementRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';

  const availableTool = {
    id: 'tool-uuid',
    tenantId,
    name: 'Grue Liebherr',
    category: 'Levage',
    status: ToolStatus.AVAILABLE,
  };

  const inUseTool = { ...availableTool, status: ToolStatus.IN_USE };
  const retiredTool = { ...availableTool, status: ToolStatus.RETIRED };

  beforeEach(async () => {
    toolRepo = createMockRepository();
    movementRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        { provide: getRepositoryToken(Tool), useValue: toolRepo },
        { provide: getRepositoryToken(ToolMovement), useValue: movementRepo },
      ],
    }).compile();

    service = module.get<ToolsService>(ToolsService);
  });

  describe('RG11 — OUT movement validation', () => {
    it('allows OUT when tool is available', async () => {
      // First call: findOne for initial check
      // Second call: findOne after update to return updated status
      toolRepo
        .findOne!.mockResolvedValueOnce(availableTool)
        .mockResolvedValueOnce({ ...availableTool, status: ToolStatus.IN_USE });

      toolRepo.update!.mockResolvedValue(undefined);
      movementRepo.create!.mockReturnValue({
        id: 'movement-uuid',
        movementType: 'OUT',
      });
      movementRepo.save!.mockResolvedValue({
        id: 'movement-uuid',
        movementType: 'OUT',
      });

      const result = await service.createMovement(tenantId, 'tool-uuid', {
        movementType: MovementDirection.OUT,
        responsibleId: 'p-uuid',
      });

      expect(toolRepo.update).toHaveBeenCalledWith('tool-uuid', {
        status: ToolStatus.IN_USE,
      });
      expect(result.tool.status).toBe(ToolStatus.IN_USE);
    });

    it('throws TOOL_NOT_AVAILABLE (RG11) when tool is in_use', async () => {
      toolRepo.findOne!.mockResolvedValue(inUseTool);

      let caughtError: UnprocessableEntityException | undefined;
      try {
        await service.createMovement(tenantId, 'tool-uuid', {
          movementType: MovementDirection.OUT,
          responsibleId: 'p-uuid',
        });
      } catch (e) {
        caughtError = e as UnprocessableEntityException;
      }

      expect(caughtError).toBeDefined();
      const response = caughtError!.getResponse() as ToolErrorResponse;
      expect(response.error).toBe('TOOL_NOT_AVAILABLE');
    });
  });

  describe('RG15 — IN movement validation', () => {
    it('allows IN when tool is in_use', async () => {
      // First call: initial check — tool is in_use
      // Second call: after update — tool back to available
      toolRepo
        .findOne!.mockResolvedValueOnce(inUseTool)
        .mockResolvedValueOnce({ ...inUseTool, status: ToolStatus.AVAILABLE });

      toolRepo.update!.mockResolvedValue(undefined);
      movementRepo.create!.mockReturnValue({
        id: 'movement-uuid',
        movementType: 'IN',
      });
      movementRepo.save!.mockResolvedValue({
        id: 'movement-uuid',
        movementType: 'IN',
      });

      const result = await service.createMovement(tenantId, 'tool-uuid', {
        movementType: MovementDirection.IN,
        responsibleId: 'p-uuid',
      });

      expect(toolRepo.update).toHaveBeenCalledWith('tool-uuid', {
        status: ToolStatus.AVAILABLE,
      });
      expect(result.tool.status).toBe(ToolStatus.AVAILABLE);
    });

    it('throws TOOL_NOT_IN_USE (RG15) when tool is available', async () => {
      toolRepo.findOne!.mockResolvedValue(availableTool);

      let caughtError: UnprocessableEntityException | undefined;
      try {
        await service.createMovement(tenantId, 'tool-uuid', {
          movementType: MovementDirection.IN,
          responsibleId: 'p-uuid',
        });
      } catch (e) {
        caughtError = e as UnprocessableEntityException;
      }

      expect(caughtError).toBeDefined();
      const response = caughtError!.getResponse() as ToolErrorResponse;
      expect(response.error).toBe('TOOL_NOT_IN_USE');
    });
  });

  describe('RG16 — retired tool validation', () => {
    it('throws TOOL_RETIRED (RG16) when trying OUT on retired tool', async () => {
      toolRepo.findOne!.mockResolvedValue(retiredTool);

      let caughtError: UnprocessableEntityException | undefined;
      try {
        await service.createMovement(tenantId, 'tool-uuid', {
          movementType: MovementDirection.OUT,
          responsibleId: 'p-uuid',
        });
      } catch (e) {
        caughtError = e as UnprocessableEntityException;
      }

      expect(caughtError).toBeDefined();
      const response = caughtError!.getResponse() as ToolErrorResponse;
      expect(response.error).toBe('TOOL_RETIRED');
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws TOOL_NOT_FOUND for unknown id', async () => {
      toolRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
