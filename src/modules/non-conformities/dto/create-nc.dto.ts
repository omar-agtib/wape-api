import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnnotationPathDto {
  @ApiProperty({ enum: ['pen', 'highlight', 'pin', 'warning'] })
  @IsString()
  tool: string;

  @ApiProperty({ example: '#ef4444' })
  @IsString()
  color: string;

  @ApiProperty({ description: 'Array of [x%, y%] points', type: 'array' })
  @IsArray()
  points: number[][];
}

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

  @ApiPropertyOptional({
    description: 'Personnel UUID responsible for this NC',
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'How the NC was resolved' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ type: [AnnotationPathDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationPathDto)
  annotations?: AnnotationPathDto[];
}
