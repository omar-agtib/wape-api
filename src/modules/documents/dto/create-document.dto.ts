import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DocSourceType } from '../../../common/enums';

export class CreateDocumentDto {
  @ApiProperty({ enum: DocSourceType, example: DocSourceType.PROJECT })
  @IsEnum(DocSourceType)
  sourceType: DocSourceType;

  @ApiProperty({
    example: 'uuid-of-source-entity',
    description: 'ID of the entity this document belongs to',
  })
  @IsUUID()
  sourceId: string;

  @ApiProperty({ example: 'Plan-execution-Bloc-A.pdf' })
  @IsString()
  @IsNotEmpty()
  documentName: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/docs/plan.pdf',
    description: 'S3 URL of the uploaded file',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({
    example: 'pdf',
    enum: ['pdf', 'image', 'xlsx', 'docx', 'other'],
  })
  @IsIn(['pdf', 'image', 'xlsx', 'docx', 'other'])
  fileType: string;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional({
    example: 'Approved execution plan for Bloc A foundations',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
