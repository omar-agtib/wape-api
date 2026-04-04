import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsIn, IsNotEmpty, IsNumber,
  IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreateProjectDto {
  @ApiProperty({ example: 'Construction Résidence Atlas' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'uuid-of-client-contact',
    description: 'Client contact ID (must be contact_type=client). Validated in Sprint 3.',
  })
  @IsOptional() @IsUUID()
  clientId?: string;

  @ApiProperty({ example: 2500000.00, description: 'Total budget (must be > 0)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'INVALID_BUDGET: budget must be greater than 0' })
  budget: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES, { message: 'UNSUPPORTED_CURRENCY' })
  currency: string;

  @ApiProperty({ example: '2026-04-01', description: 'ISO date YYYY-MM-DD' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'ISO date YYYY-MM-DD — must be after startDate' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Construction of 12-floor residential tower' })
  @IsOptional() @IsString()
  description?: string;
}