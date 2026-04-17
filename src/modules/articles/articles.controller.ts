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
  ApiQuery,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './article.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('articles')
@ApiBearerAuth('JWT')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Post()
  @RequirePermission('articles_stock', 'C')
  @ApiOperation({
    summary: 'Create article — auto-generates unique barcode ID (RG05)',
    description:
      '`barcodeId` is immutable after creation. `barcodeImageUrl` is populated asynchronously (Sprint 5 BullMQ queue).',
  })
  @ApiResponse({ status: 201, type: Article })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateArticleDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('articles_stock', 'R')
  @ApiOperation({ summary: 'List articles with live stock quantities' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.tenantId, pagination, {
      category,
      search,
    });
  }

  @Get(':id')
  @RequirePermission('articles_stock', 'R')
  @ApiOperation({
    summary: 'Get article detail + computed availableQuantity',
    description: '`availableQuantity = stockQuantity - reservedQuantity`',
  })
  @ApiResponse({ status: 200, type: Article })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('articles_stock', 'U')
  @ApiOperation({
    summary: 'Update article — barcodeId excluded (RG05 immutable)',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('articles_stock', 'D')
  @ApiOperation({ summary: 'Soft delete article' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.service.remove(user.tenantId, id);
    return { message: 'Article deleted successfully' };
  }
}
