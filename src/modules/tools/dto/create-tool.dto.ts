import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength,
} from 'class-validator';

export class CreateToolDto {
  @ApiProperty({ example: 'Grue à tour Liebherr 200T' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Levage', description: 'Tool category' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: 'LBH-2024-00123' })
  @IsOptional() @IsString() @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'https://s3.../tool.jpg' })
  @IsOptional()
  photoUrl?: string;
}