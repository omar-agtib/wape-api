import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreateArticleDto {
  @ApiProperty({ example: 'Ciment Portland CPJ 45' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Matériaux de construction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: 85.0, description: 'Unit price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES, { message: 'UNSUPPORTED_CURRENCY' })
  currency: string;

  @ApiPropertyOptional({ example: 500, description: 'Initial stock quantity' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Minimum stock threshold for alerts',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 'Sac 50kg' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;
}
