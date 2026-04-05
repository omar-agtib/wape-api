import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { NcStatus } from '../../../common/enums';

export class NcFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NcStatus })
  @IsOptional()
  @IsEnum(NcStatus)
  status?: NcStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
