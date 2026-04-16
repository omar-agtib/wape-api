import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNcDto {
  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Fissure murale Niveau 3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example:
      'Fissure horizontale de 2cm détectée sur le mur porteur nord du niveau 3.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: 42.5,
    description:
      'X position of marker on plan as percentage (0–100) of plan width',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  markerX?: number;

  @ApiPropertyOptional({
    example: 67.3,
    description:
      'Y position of marker on plan as percentage (0–100) of plan height',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  markerY?: number;

  @ApiPropertyOptional({
    example: 'medium',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Niveau 3 — Mur nord' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  deadline?: string;
}
