import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class NouvelleVersionDto {
  @ApiProperty({ description: 'Nouvelle URL Cloudinary' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ enum: ['png', 'jpg', 'jpeg', 'pdf'] })
  @IsIn(['png', 'jpg', 'jpeg', 'pdf'])
  fileType: string;

  @ApiPropertyOptional({ example: 'Mise à jour façade nord' })
  @IsOptional()
  @IsString()
  commentaireVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  largeurPx?: number;

  @ApiPropertyOptional()
  @IsOptional()
  hauteurPx?: number;
}
