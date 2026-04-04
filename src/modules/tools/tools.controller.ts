import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { CreateToolMovementDto } from './dto/tool-movement.dto';
import { Tool } from './tool.entity';
import { ToolMovement } from './tool-movement.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ToolStatus } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('tools')
@ApiBearerAuth('JWT')
@Controller('tools')
export class ToolsController {
  constructor(private readonly service: ToolsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create a tool' })
  @ApiResponse({ status: 201, type: Tool })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateToolDto): Promise<Tool> {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tools (paginated + filters)' })
  @ApiQuery({ name: 'status', required: false, enum: ToolStatus })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('status') status?: ToolStatus,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.tenantId, pagination, { status, category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tool detail' })
  @ApiResponse({ status: 200, type: Tool })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<Tool> {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update tool' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateToolDto,
  ): Promise<Tool> {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete tool' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Tool deleted successfully' };
  }

  @Post(':id/movements')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Create a manual tool movement (IN / OUT)',
    description: `Rules:
- **OUT** requires tool status = \`available\` (RG11)
- **IN** requires tool status = \`in_use\` (RG15)
- \`retired\` tools cannot have OUT movements (RG16)`,
  })
  @ApiResponse({ status: 201, type: ToolMovement })
  @ApiResponse({ status: 422, description: 'TOOL_NOT_AVAILABLE | TOOL_NOT_IN_USE | TOOL_RETIRED' })
  createMovement(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateToolMovementDto,
  ): Promise<ToolMovement> {
    return this.service.createMovement(user.tenantId, id, dto, false);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Get movement history for a tool' })
  getMovements(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ToolMovement[]> {
    return this.service.getMovements(user.tenantId, id);
  }
}