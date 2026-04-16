import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TypeContratOperateur,
  SUPPORTED_CURRENCIES,
} from '../../../common/enums';

export class CreateOperateurDto {
  @ApiProperty({ example: 'Ahmed Benali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomComplet: string;

  @ApiPropertyOptional({ example: 'AB123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cin?: string;

  @ApiPropertyOptional({ example: '+212661000001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @ApiProperty({ enum: TypeContratOperateur })
  @IsEnum(TypeContratOperateur)
  typeContrat: TypeContratOperateur;

  @ApiPropertyOptional({ example: 250.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tauxJournalier?: number;

  @ApiPropertyOptional({ example: 'MAD' })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projetActuelId?: string;
}
