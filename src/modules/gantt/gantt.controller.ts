import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GanttService } from './gantt.service';
import { GanttFilterDto } from './dto/gantt-filter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('gantt')
@ApiBearerAuth('JWT')
@Controller('projects')
export class GanttController {
  constructor(private readonly service: GanttService) {}

  @Get(':id/gantt')
  @ApiOperation({
    summary: 'Get Gantt data for a project (C2)',
    description: `Returns structured JSON for building a Gantt chart on the frontend.

**All filters are optional and combinable:**
- \`startDate\` + \`endDate\` — tasks whose period overlaps the range
- \`personnelId\` — tasks that include this personnel member
- \`toolId\` — tasks that use this specific tool
- \`articleId\` — tasks that use this specific article

Each task includes its full **personnel**, **tools**, and **articles** arrays.`,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2026-04-01',
    description: 'ISO date — filter tasks overlapping from this date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2026-12-31',
    description: 'ISO date — filter tasks overlapping until this date',
  })
  @ApiQuery({
    name: 'personnelId',
    required: false,
    description: 'UUID — return only tasks assigned to this personnel member',
  })
  @ApiQuery({
    name: 'toolId',
    required: false,
    description: 'UUID — return only tasks that use this tool',
  })
  @ApiQuery({
    name: 'articleId',
    required: false,
    description: 'UUID — return only tasks that use this article',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  getGantt(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('personnelId') personnelId?: string,
    @Query('toolId') toolId?: string,
    @Query('articleId') articleId?: string,
  ) {
    const filters: GanttFilterDto = {
      startDate,
      endDate,
      personnelId,
      toolId,
      articleId,
    };
    return this.service.getGantt(user.tenantId, id, filters);
  }
}
