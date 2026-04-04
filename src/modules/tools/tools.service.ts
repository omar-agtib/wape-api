import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool } from './tool.entity';
import { ToolMovement } from './tool-movement.entity';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { CreateToolMovementDto, MovementDirection } from './dto/tool-movement.dto';
import { ToolStatus } from '../../common/enums';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolRepo: Repository<Tool>,
    @InjectRepository(ToolMovement)
    private readonly movementRepo: Repository<ToolMovement>,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateToolDto): Promise<Tool> {
    const tool = this.toolRepo.create({ ...dto, tenantId, status: ToolStatus.AVAILABLE });
    return this.toolRepo.save(tool);
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters: { status?: ToolStatus; category?: string; search?: string },
  ): Promise<PaginatedResult<Tool>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.toolRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if (filters.status)   qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.category) qb.andWhere('t.category ILIKE :cat', { cat: `%${filters.category}%` });
    if (filters.search)   qb.andWhere('t.name ILIKE :search', { search: `%${filters.search}%` });

    qb.orderBy('t.name', 'ASC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Tool> {
    const tool = await this.toolRepo.findOne({ where: { id, tenantId } });
    if (!tool) throw new NotFoundException({ error: 'TOOL_NOT_FOUND', message: `Tool '${id}' not found` });
    return tool;
  }

  async update(tenantId: string, id: string, dto: UpdateToolDto): Promise<Tool> {
    const tool = await this.findOne(tenantId, id);
    Object.assign(tool, dto);
    return this.toolRepo.save(tool);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const tool = await this.findOne(tenantId, id);
    await this.toolRepo.softRemove(tool);
  }

  // ── Manual movements ────────────────────────────────────────────────────────

  async createMovement(
    tenantId: string,
    toolId: string,
    dto: CreateToolMovementDto,
    isAuto = false,
    taskId?: string,
  ): Promise<ToolMovement> {
    const tool = await this.findOne(tenantId, toolId);
    this.validateMovement(tool, dto.movementType as MovementDirection);

    const newStatus =
      dto.movementType === MovementDirection.OUT ? ToolStatus.IN_USE : ToolStatus.AVAILABLE;

    await this.toolRepo.update(toolId, { status: newStatus });

    const movement = this.movementRepo.create({
      toolId,
      movementType: dto.movementType,
      responsibleId: dto.responsibleId,
      notes: dto.notes,
      movementDate: new Date(),
      isAuto,
      taskId,
    });

    return this.movementRepo.save(movement);
  }

  async getMovements(tenantId: string, toolId: string): Promise<ToolMovement[]> {
    await this.findOne(tenantId, toolId);
    return this.movementRepo.find({
      where: { toolId },
      order: { movementDate: 'DESC' },
    });
  }

  // ── Internal: used by W1/W2 ─────────────────────────────────────────────────

  async autoOut(toolId: string, tenantId: string, responsibleId: string, taskId: string): Promise<void> {
    await this.createMovement(
      tenantId, toolId,
      { movementType: MovementDirection.OUT, responsibleId },
      true, taskId,
    );
  }

  async autoIn(toolId: string, tenantId: string, responsibleId: string, taskId: string): Promise<void> {
    await this.createMovement(
      tenantId, toolId,
      { movementType: MovementDirection.IN, responsibleId },
      true, taskId,
    );
  }

  async findOneRaw(tenantId: string, id: string): Promise<Tool> {
    return this.findOne(tenantId, id);
  }

  // ── Validation helpers (RG11, RG15, RG16) ───────────────────────────────────

  private validateMovement(tool: Tool, direction: MovementDirection): void {
    // RG16 — retired tools can never move OUT
    if (tool.status === ToolStatus.RETIRED && direction === MovementDirection.OUT) {
      throw new UnprocessableEntityException({
        error: 'TOOL_RETIRED',
        message: `Tool '${tool.name}' is retired and cannot be deployed`,
      });
    }
    // RG11 — OUT requires available
    if (direction === MovementDirection.OUT && tool.status !== ToolStatus.AVAILABLE) {
      throw new UnprocessableEntityException({
        error: 'TOOL_NOT_AVAILABLE',
        message: `Tool '${tool.name}' is not available (current status: ${tool.status})`,
        details: { toolId: tool.id, currentStatus: tool.status },
      });
    }
    // RG15 — IN requires in_use
    if (direction === MovementDirection.IN && tool.status !== ToolStatus.IN_USE) {
      throw new UnprocessableEntityException({
        error: 'TOOL_NOT_IN_USE',
        message: `Tool '${tool.name}' is not in use (current status: ${tool.status})`,
        details: { toolId: tool.id, currentStatus: tool.status },
      });
    }
  }
}