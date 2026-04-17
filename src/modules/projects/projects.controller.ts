import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFilterDto } from './dto/project-filter.dto';
import { Project } from './project.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('projects')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @RequirePermission('projects', 'C')
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, type: Project })
  @ApiResponse({
    status: 422,
    description: 'INVALID_DATE_RANGE | INVALID_BUDGET | UNSUPPORTED_CURRENCY',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @RequirePermission('projects', 'R')
  @ApiOperation({ summary: 'List projects (paginated + filters)' })
  @ApiResponse({ status: 200 })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ProjectFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @RequirePermission('projects', 'R')
  @ApiOperation({ summary: 'Get project detail + finance snapshot' })
  @ApiResponse({ status: 200, type: Project })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('projects', 'U')
  @ApiOperation({
    summary:
      'Update project — budget change triggers W10 (finance snapshot update)',
  })
  @ApiResponse({ status: 200, type: Project })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.service.update(user.tenantId, id, user.sub, dto);
  }

  @Delete(':id')
  @RequirePermission('projects', 'D')
  @ApiOperation({ summary: 'Soft delete project' })
  @ApiResponse({ status: 200 })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Project deleted successfully' };
  }

  @Get(':id/finance')
  @RequirePermission('finance', 'R')
  @ApiOperation({
    summary:
      'Finance dashboard — budget vs spent, alert level, breakdown by category',
    description: `Returns the \`project_finance_snapshot\` with computed fields:
- \`percentConsumed\` — (totalSpent / totalBudget) × 100
- \`alertLevel\` — \`normal\` (< 80%) | \`warning\` (80–99%) | \`critical\` (≥ 100%)
- \`breakdown\` — split by personnel / articles / tools`,
  })
  getFinance(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getFinance(user.tenantId, id);
  }

  @Get(':id/tasks')
  @RequirePermission('tasks', 'R')
  @ApiOperation({
    summary: 'Tasks for this project',
    description: 'Convenience alias for `GET /api/tasks?projectId=:id`',
  })
  getTasks(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id).then((p) => ({
      hint: `Use GET /api/tasks?projectId=${id} for paginated results`,
      projectId: id,
      projectName: p.name,
    }));
  }

  @Get(':id/attachments')
  @RequirePermission('attachments', 'R')
  @ApiOperation({
    summary: 'Attachments for this project (C9)',
    description: 'Convenience alias for `GET /api/attachments?projectId=:id`',
  })
  getAttachments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id).then((p) => ({
      hint: `Use GET /api/attachments?projectId=${id} for full paginated results`,
      projectId: id,
      projectName: p.name,
    }));
  }

  @Get(':id/purchase-orders')
  @RequirePermission('purchase_orders', 'R')
  @ApiOperation({
    summary: 'Purchase orders linked to this project (C8)',
    description:
      'Convenience alias for `GET /api/purchase-orders?projectId=:id`',
  })
  getPurchaseOrders(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id).then((p) => ({
      hint: `Use GET /api/purchase-orders?projectId=${id} for full paginated results`,
      projectId: id,
      projectName: p.name,
    }));
  }
}
