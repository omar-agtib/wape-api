import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PlanCategorie, PlanStatut } from '../../../common/enums';

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PlanCategorie })
  @IsOptional()
  @IsEnum(PlanCategorie)
  categorie?: PlanCategorie;

  @ApiPropertyOptional({ enum: PlanStatut })
  @IsOptional()
  @IsEnum(PlanStatut)
  statut?: PlanStatut;
}
