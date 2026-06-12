import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StockMovementType } from '../../../common/enums';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Article this movement applies to' })
  @IsUUID()
  articleId: string;

  @ApiProperty({
    enum: StockMovementType,
    description: 'Only IN or OUT for manual movements',
  })
  @IsEnum(StockMovementType)
  movementType: StockMovementType;

  @ApiProperty({ example: 50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: '2026-06-12' })
  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @ApiPropertyOptional({ description: 'Responsible personnel id' })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @ApiPropertyOptional({ description: 'Related project id' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
