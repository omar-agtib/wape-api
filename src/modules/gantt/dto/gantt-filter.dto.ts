import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GanttFilterDto {
  @ApiPropertyOptional({
    example: '2026-04-01',
    description:
      'Return only tasks whose period overlaps with [startDate, endDate]',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Return only tasks assigned to this personnel',
  })
  @IsOptional()
  @IsUUID()
  personnelId?: string;

  @ApiPropertyOptional({ description: 'Return only tasks using this tool' })
  @IsOptional()
  @IsUUID()
  toolId?: string;

  @ApiPropertyOptional({ description: 'Return only tasks using this article' })
  @IsOptional()
  @IsUUID()
  articleId?: string;
}
