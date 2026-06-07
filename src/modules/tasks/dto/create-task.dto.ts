import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES, TaskPriority } from '../../../common/enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Fondations Bloc A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: 'Bloc A', description: 'Zone / area' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  zone?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    description: 'Defaults to medium if omitted',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-15', description: 'Must be >= startDate' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES, { message: 'UNSUPPORTED_CURRENCY' })
  currency: string;

  @ApiPropertyOptional({ example: 'Excavation and concrete for foundation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Manual progress override (0-100)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  progress?: number;
}
