import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreatePersonnelDto {
  @ApiProperty({ example: 'Karim Benali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'Chef de chantier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role: string;

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
