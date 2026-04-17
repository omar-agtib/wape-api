import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/task-status.dto';
import {
  AddTaskPersonnelDto,
  UpdateTaskPersonnelDto,
  AddTaskArticleDto,
  UpdateTaskArticleDto,
  AddTaskToolDto,
  UpdateTaskToolDto,
} from './dto/task-resource.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TaskStatus } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @RequirePermission('tasks', 'C')
  @ApiOperation({ summary: 'Create a task' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('tasks', 'R')
  @ApiOperation({ summary: 'List tasks (paginated)' })
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
    return this.service.findAll(user.tenantId, pagination, {
      projectId,
      status,
      search,
    });
  }

  @Get(':id')
  @RequirePermission('tasks', 'R')
  @ApiOperation({ summary: 'Task detail with personnel, articles, tools' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('tasks', 'U')
  @ApiOperation({ summary: 'Update task' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('tasks', 'U')
  @ApiOperation({
    summary: 'Change task status — triggers W1 or W2',
    description: `**planned → on_progress (W1):** Checks stock for all articles. Reserves stock. Creates OUT movements for all tools.  
**on_progress → completed (W2):** Consumes stock. Creates IN movements for all tools. Returns tools to available.  
All steps run in a single DB transaction — any failure rolls back completely.`,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 422,
    description:
      'INSUFFICIENT_STOCK | INVALID_STATUS_TRANSITION | TOOL_NOT_AVAILABLE',
  })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeTaskStatusDto,
  ) {
    return this.service.changeStatus(user.tenantId, id, dto.status);
  }

  @Delete(':id')
  @RequirePermission('tasks', 'D')
  @ApiOperation({ summary: 'Soft delete task' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Task deleted successfully' };
  }

  // ── Personnel ──────────────────────────────────────────────────────────────

  @Post(':id/personnel')
  @RequirePermission('tasks', 'C')
  @ApiOperation({
    summary: 'Add personnel to task (unitCost pre-filled, overridable)',
  })
  addPersonnel(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddTaskPersonnelDto,
  ) {
    return this.service.addPersonnel(u.tenantId, id, dto);
  }

  @Get(':id/personnel')
  @RequirePermission('tasks', 'R')
  @ApiOperation({ summary: 'List personnel assigned to task' })
  listPersonnel(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.service.listPersonnel(u.tenantId, id);
  }

  @Put(':id/personnel/:rid')
  @RequirePermission('tasks', 'U')
  @ApiOperation({ summary: 'Update personnel assignment' })
  updatePersonnel(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateTaskPersonnelDto,
  ) {
    return this.service.updatePersonnel(u.tenantId, id, rid, dto);
  }

  @Delete(':id/personnel/:rid')
  @RequirePermission('tasks', 'D')
  @ApiOperation({ summary: 'Remove personnel from task' })
  async removePersonnel(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
  ): Promise<{ message: string }> {
    await this.service.removePersonnel(u.tenantId, id, rid);
    return { message: 'Personnel removed' };
  }

  // ── Articles ───────────────────────────────────────────────────────────────

  @Post(':id/articles')
  @RequirePermission('tasks', 'C')
  @ApiOperation({
    summary: 'Add article to task (unitCost pre-filled from article.unitPrice)',
  })
  addArticle(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddTaskArticleDto,
  ) {
    return this.service.addArticle(u.tenantId, id, dto);
  }

  @Get(':id/articles')
  @RequirePermission('tasks', 'R')
  @ApiOperation({ summary: 'List articles assigned to task' })
  listArticles(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.service.listArticles(u.tenantId, id);
  }

  @Put(':id/articles/:rid')
  @RequirePermission('tasks', 'U')
  @ApiOperation({ summary: 'Update article quantity / cost' })
  updateArticle(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateTaskArticleDto,
  ) {
    return this.service.updateArticle(u.tenantId, id, rid, dto);
  }

  @Delete(':id/articles/:rid')
  @RequirePermission('tasks', 'D')
  @ApiOperation({ summary: 'Remove article from task' })
  async removeArticle(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
  ): Promise<{ message: string }> {
    await this.service.removeArticle(u.tenantId, id, rid);
    return { message: 'Article removed' };
  }

  // ── Tools ──────────────────────────────────────────────────────────────────

  @Post(':id/tools')
  @RequirePermission('tasks', 'C')
  @ApiOperation({ summary: 'Add tool to task' })
  addTool(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddTaskToolDto,
  ) {
    return this.service.addTool(u.tenantId, id, dto);
  }

  @Get(':id/tools')
  @RequirePermission('tasks', 'R')
  @ApiOperation({ summary: 'List tools assigned to task' })
  listTools(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.service.listTools(u.tenantId, id);
  }

  @Put(':id/tools/:rid')
  @RequirePermission('tasks', 'U')
  @ApiOperation({ summary: 'Update tool quantity / cost' })
  updateTool(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateTaskToolDto,
  ) {
    return this.service.updateTool(u.tenantId, id, rid, dto);
  }

  @Delete(':id/tools/:rid')
  @RequirePermission('tasks', 'D')
  @ApiOperation({ summary: 'Remove tool from task' })
  async removeTool(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('rid') rid: string,
  ): Promise<{ message: string }> {
    await this.service.removeTool(u.tenantId, id, rid);
    return { message: 'Tool removed' };
  }
}
