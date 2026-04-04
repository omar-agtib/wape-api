import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class AddTaskPersonnelDto {
  @ApiProperty({ example: 'uuid-of-personnel' })
  @IsUUID()
  personnelId: string;

  @ApiProperty({ example: 40, description: 'Planned hours' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    example: 150.00,
    description: 'Unit cost — pre-filled from personnel.costPerHour but overridable',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

export class UpdateTaskPersonnelDto {
  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({ example: 160.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'MAD' })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}