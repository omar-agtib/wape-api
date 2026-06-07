import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TaskStatus } from '../../../common/enums';

export class ListTasksQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by project' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Search by task name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Only tasks with this personnel assigned',
  })
  @IsOptional()
  @IsUUID()
  personnelId?: string;

  @ApiPropertyOptional({ description: 'Only tasks with this tool assigned' })
  @IsOptional()
  @IsUUID()
  toolId?: string;

  @ApiPropertyOptional({ description: 'Only tasks with this article assigned' })
  @IsOptional()
  @IsUUID()
  articleId?: string;
}
