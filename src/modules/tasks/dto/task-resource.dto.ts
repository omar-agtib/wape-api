import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn, IsNumber, IsOptional, IsUUID, Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

// ── Personnel ─────────────────────────────────────────────────────────────────

export class AddTaskPersonnelDto {
  @ApiProperty({ example: 'uuid-of-personnel' })
  @IsUUID()
  personnelId: string;

  @ApiProperty({ example: 40, description: 'Planned hours' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 150.00, description: 'Pre-filled from personnel.costPerHour, overridable' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

export class UpdateTaskPersonnelDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

// ── Articles ──────────────────────────────────────────────────────────────────

export class AddTaskArticleDto {
  @ApiProperty({ example: 'uuid-of-article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 50, description: 'Planned quantity to use' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 85.00, description: 'Pre-filled from article.unitPrice, overridable' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

export class UpdateTaskArticleDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export class AddTaskToolDto {
  @ApiProperty({ example: 'uuid-of-tool' })
  @IsUUID()
  toolId: string;

  @ApiProperty({ example: 5, description: 'Planned days / units of use' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 1200.00, description: 'Daily cost — default 0' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

export class UpdateTaskToolDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  unitCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}