import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReceptionsService } from './receptions.service';
import { ReceiveDto } from './dto/receive.dto';
import { ReceptionFilterDto } from './dto/reception-filter.dto';
import { Reception } from './reception.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('receptions')
@ApiBearerAuth('JWT')
@Controller('receptions')
export class ReceptionsController {
  constructor(private readonly service: ReceptionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List reception lines (paginated)',
    description: 'Filter by `purchaseOrderId`, `status` (pending/partial/completed), or `articleId`.',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ReceptionFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Post(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @ApiOperation({
    summary: 'Record goods receipt — triggers W6',
    description: `**Workflow W6:**
1. Validates received quantity ≤ remaining (RG04)
2. Updates reception status (partial → new row created for remainder, completed → done)
3. Increments \`articles.stockQuantity\`
4. Creates a \`stock_movements\` record (type=incoming)
5. Updates \`purchase_order_lines.receivedQuantity\`
6. Re-evaluates PO status → partial or completed

All steps run in a single DB transaction.`,
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 422, description: 'QUANTITY_EXCEEDS_REMAINING (RG04) | PO_COMPLETED (RG20)' })
  receive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReceiveDto,
  ) {
    return this.service.receive(user.tenantId, id, dto, user.sub);
  }
}