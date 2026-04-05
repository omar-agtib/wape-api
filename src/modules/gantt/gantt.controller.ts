import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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

**Filters:**
- \`startDate\` + \`endDate\` — returns tasks whose period overlaps the range
- \`personnelId\` — returns tasks that include this personnel member
- \`toolId\` — returns tasks that use this tool
- \`articleId\` — returns tasks that use this article

Each task includes its **personnel**, **tools**, and **articles** arrays for full resource visibility.`,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  getGantt(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() filters: GanttFilterDto,
  ) {
    return this.service.getGantt(user.tenantId, id, filters);
  }
}
