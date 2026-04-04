import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ProjectStatus } from '../../../common/enums';

export class ProjectFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsIn(Object.values(ProjectStatus))
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional() @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({ description: 'Search by project name' })
  @IsOptional()
  search?: string;
}