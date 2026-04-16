import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { StatutPresence, TypeContratOperateur } from '../../../common/enums';

export class CreatePointageDto {
  @ApiProperty({ example: 'uuid-operateur' })
  @IsUUID()
  operateurId: string;

  @ApiProperty({ example: 'uuid-projet' })
  @IsUUID()
  projetId: string;

  @ApiPropertyOptional({ example: 'uuid-tache' })
  @IsOptional()
  @IsUUID()
  tacheId?: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  datePointage: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Format HH:MM — NULL si absent',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'heureDebut must be HH:MM' })
  heureDebut?: string;

  @ApiPropertyOptional({
    example: '17:00',
    description: 'Format HH:MM — NULL si absent',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'heureFin must be HH:MM' })
  heureFin?: string;

  @ApiProperty({ enum: StatutPresence })
  @IsEnum(StatutPresence)
  statutPresence: StatutPresence;

  @ApiPropertyOptional({ enum: TypeContratOperateur })
  @IsOptional()
  @IsEnum(TypeContratOperateur)
  typeContrat?: TypeContratOperateur;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;
}
