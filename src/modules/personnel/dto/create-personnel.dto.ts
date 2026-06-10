import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
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
import {
  SUPPORTED_CURRENCIES,
  PersonnelStatus,
  ContractType,
} from '../../../common/enums';

export class CreatePersonnelDto {
  @ApiProperty({ example: 'Karim Benali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'Chef de chantier', description: 'Function' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role: string;

  @ApiPropertyOptional({ example: 'Senior Engineer', description: 'Job title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobTitle?: string;

  @ApiPropertyOptional({
    enum: PersonnelStatus,
    default: PersonnelStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PersonnelStatus)
  status?: PersonnelStatus;

  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @ApiPropertyOptional({ example: 48, description: 'Weekly working hours' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weeklyHours?: number;

  @ApiPropertyOptional({
    example: 8000.0,
    description: 'Salary (informational)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ description: 'Assigned project id' })
  @IsOptional()
  @IsUUID()
  assignedProjectId?: string;

  @ApiProperty({ example: 150.0, description: 'Hourly cost' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerHour: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiPropertyOptional({ example: 'karim@acme.ma' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+212600000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Casablanca, Maroc' })
  @IsOptional()
  @IsString()
  address?: string;
}
