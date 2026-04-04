import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { StockMovementType } from '../../../common/enums';

export class StockFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by article ID' })
  @IsOptional() @IsUUID()
  articleId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsIn(Object.values(StockMovementType))
  movementType?: StockMovementType;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional() @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  dateTo?: string;
}