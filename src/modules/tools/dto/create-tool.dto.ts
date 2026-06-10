import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { ToolStatus } from '../../../common/enums';

export class CreateToolDto {
  @ApiProperty({ example: 'Grue à tour Liebherr 200T' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Levage', description: 'Tool category' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'LBH-2024-00123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'https://s3.../tool.jpg' })
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'Warehouse', description: 'Tool location' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 18000.0, description: 'Purchase cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({ description: 'Assigned project id' })
  @IsOptional()
  @IsUUID()
  assignedProjectId?: string;
  @ApiPropertyOptional({ enum: ToolStatus, default: ToolStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;
}
