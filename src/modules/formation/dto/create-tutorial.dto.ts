import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTutorialDto {
  @ApiProperty({ example: 'Comment créer un projet dans WAPE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Guide de démarrage',
    description: 'Tutorial category',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({
    example: '<h2>Introduction</h2><p>Ce guide explique...</p>',
    description: 'HTML or Markdown content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=...' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order within category',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Only published tutorials are visible to non-admins',
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
