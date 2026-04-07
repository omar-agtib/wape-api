import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PoFilterDto } from './dto/po-filter.dto';
import { PurchaseOrder } from './purchase-order.entity';
import { ReceptionsService } from '../receptions/receptions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('purchase-orders')
@ApiBearerAuth('JWT')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly service: PurchaseOrdersService,
    @Inject(forwardRef(() => ReceptionsService))
    private readonly receptionsService: ReceptionsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Create a purchase order (draft)',
    description:
      '`supplierId` must be a contact with `contactType=supplier` (RG08). Order number `BC-YYYY-NNNN` is auto-generated.',
  })
  @ApiResponse({ status: 201, type: PurchaseOrder })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders (paginated + filters)' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: PoFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PO detail with all lines' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Confirm purchase order — triggers W5',
    description: `**Workflow W5:**
1. PO status: \`draft\` → \`confirmed\`
2. One reception row created per PO line (\`status=pending\`, \`expected_qty = ordered_qty\`)
3. Receptions visible at \`GET /api/receptions?purchaseOrderId=:id\``,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 422, description: 'PO_NOT_DRAFT' })
  async confirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const { purchaseOrder } = await this.service.confirm(user.tenantId, id);

    // W5 — create reception rows for each line
    const lines = await this.service.getLines(id);
    const receptions = await this.receptionsService.createFromPo(id, lines);

    return {
      purchaseOrder,
      receptions,
      message: `Purchase order confirmed. ${receptions.length} reception row(s) created.`,
    };
  }
}
