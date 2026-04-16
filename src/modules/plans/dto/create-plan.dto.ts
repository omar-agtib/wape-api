import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PlanCategorie } from '../../../common/enums';

export class CreatePlanDto {
  @ApiProperty()
  @IsUUID()
  projetId: string;

  @ApiProperty({ example: 'Plan RDC — Bâtiment A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nom: string;

  @ApiPropertyOptional({ example: 'PL-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlanCategorie })
  @IsEnum(PlanCategorie)
  categorie: PlanCategorie;

  @ApiProperty({
    description: "Cloudinary URL du fichier (upload via /upload/file d'abord)",
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ enum: ['png', 'jpg', 'jpeg', 'pdf'] })
  @IsIn(['png', 'jpg', 'jpeg', 'pdf'])
  fileType: string;

  @ApiPropertyOptional()
  @IsOptional()
  largeurPx?: number;

  @ApiPropertyOptional()
  @IsOptional()
  hauteurPx?: number;
}
