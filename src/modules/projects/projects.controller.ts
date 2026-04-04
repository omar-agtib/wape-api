import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFilterDto } from './dto/project-filter.dto';
import { Project } from './project.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('projects')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, type: Project })
  @ApiResponse({ status: 422, description: 'INVALID_DATE_RANGE | INVALID_BUDGET | UNSUPPORTED_CURRENCY' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (paginated + filters)' })
  @ApiResponse({ status: 200 })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: ProjectFilterDto,
  ) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project detail + finance snapshot' })
  @ApiResponse({ status: 200, type: Project })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update project — budget change triggers W10 (finance snapshot)' })
  @ApiResponse({ status: 200, type: Project })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.service.update(user.tenantId, id, user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
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
  @ApiOperation({
    summary: 'Finance dashboard — budget vs spent, alert level, category breakdown',
  })
  getFinance(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.service.getFinance(user.tenantId, id);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List all tasks for a project' })
  @ApiResponse({ status: 200 })
  getProjectTasks(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    // Injected lazily — TasksService is available through the module
    // This endpoint is handled in TasksController via ?projectId= filter
    // Use: GET /tasks?projectId=:id instead (same data)
    return this.service.findOne(user.tenantId, id).then((p) => ({
      projectId: id,
      hint: `Use GET /api/tasks?projectId=${id} to list tasks for this project`,
    }));
  }
}