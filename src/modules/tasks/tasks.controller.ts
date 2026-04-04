import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddTaskPersonnelDto, UpdateTaskPersonnelDto } from './dto/task-resource.dto';
import { ChangeTaskStatusDto } from './dto/task-status.dto';
import { Task } from './task.entity';
import { TaskPersonnel } from './task-personnel.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, TaskStatus } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a task under a project' })
  @ApiResponse({ status: 201, type: Task })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto): Promise<Task> {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks (paginated + filters)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.tenantId, pagination, { projectId, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task detail with personnel list' })
  @ApiResponse({ status: 200, type: Task })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update task details' })
  @ApiResponse({ status: 200, type: Task })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Change task status — triggers W-P1 (project cascade)',
    description: `Valid transitions:
- **planned → on_progress** (Sprint 2 will add stock reservation W1)
- **on_progress → completed** (Sprint 2 will add stock consumption W2)

No regression allowed. completed is terminal.`,
  })
  @ApiResponse({ status: 200, type: Task })
  @ApiResponse({ status: 422, description: 'INVALID_STATUS_TRANSITION' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeTaskStatusDto,
  ): Promise<Task> {
    return this.service.changeStatus(user.tenantId, id, dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Soft delete a task' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Task deleted successfully' };
  }

  // ── Personnel resource ────────────────────────────────────────────────────

  @Post(':id/personnel')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Add personnel to task',
    description: 'unitCost is pre-filled from personnel.costPerHour but fully overridable. Recalculates task estimatedCost.',
  })
  @ApiResponse({ status: 201, type: TaskPersonnel })
  addPersonnel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    return this.service.addPersonnel(user.tenantId, id, dto);
  }

  @Get(':id/personnel')
  @ApiOperation({ summary: 'List personnel assigned to task' })
  listPersonnel(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<TaskPersonnel[]> {
    return this.service.listPersonnel(user.tenantId, id);
  }

  @Put(':id/personnel/:rid')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update quantity / cost of a personnel assignment' })
  updatePersonnel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateTaskPersonnelDto,
  ): Promise<TaskPersonnel> {
    return this.service.updatePersonnel(user.tenantId, id, rid, dto);
  }

  @Delete(':id/personnel/:rid')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Remove a personnel assignment from task' })
  async removePersonnel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
  ): Promise<{ message: string }> {
    await this.service.removePersonnel(user.tenantId, id, rid);
    return { message: 'Personnel removed from task' };
  }
}