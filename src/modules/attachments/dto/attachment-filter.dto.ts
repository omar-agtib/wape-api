import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AttachmentStatus } from '../../../common/enums';

export class AttachmentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AttachmentStatus })
  @IsOptional()
  @IsEnum(AttachmentStatus)
  status?: AttachmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subcontractorId?: string;
}
