import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DocSourceType } from '../../../common/enums';

export class DocumentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DocSourceType })
  @IsOptional()
  @IsEnum(DocSourceType)
  sourceType?: DocSourceType;

  @ApiPropertyOptional({ description: 'Filter by source entity ID' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({
    example: 'pdf',
    enum: ['pdf', 'image', 'xlsx', 'docx', 'other'],
  })
  @IsOptional()
  fileType?: string;

  @ApiPropertyOptional({ description: 'Search by document name' })
  @IsOptional()
  search?: string;
}
