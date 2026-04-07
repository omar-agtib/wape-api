import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockFilterDto } from './dto/stock-filter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('stock')
@ApiBearerAuth('JWT')
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('movements')
  @ApiOperation({
    summary: 'Stock movement history — full audit log',
    description:
      'Filter by article, type (reserved/consumed/incoming), project, task, or date range.',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: StockFilterDto) {
    return this.service.findAll(user.tenantId, filters);
  }
}
