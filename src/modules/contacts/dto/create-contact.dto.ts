import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional,
  IsString, MaxLength,
} from 'class-validator';
import { ContactType } from '../../../common/enums';

export class CreateContactDto {
  @ApiProperty({ enum: ContactType, example: ContactType.SUPPLIER, description: 'Immutable after creation (RG17)' })
  @IsEnum(ContactType)
  contactType: ContactType;

  @ApiProperty({ example: 'SONASID S.A.' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  legalName: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Identifiant Fiscal (IF)' })
  @IsOptional() @IsString() @MaxLength(50)
  ifNumber?: string;

  @ApiPropertyOptional({ example: '001234567890123', description: 'Identifiant Commun Entreprise (ICE)' })
  @IsOptional() @IsString() @MaxLength(50)
  iceNumber?: string;

  @ApiPropertyOptional({ example: 'contact@sonasid.ma' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+212522000000' })
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Km 10, Route de Rabat, Casablanca' })
  @IsOptional() @IsString()
  address?: string;
}