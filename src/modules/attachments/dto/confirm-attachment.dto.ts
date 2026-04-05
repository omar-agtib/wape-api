import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmAttachmentDto {
  @ApiPropertyOptional({
    example: 45000.0,
    description:
      'Override personnel cost. If omitted → copied from task_personnel totals.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  personnelCost?: number;

  @ApiPropertyOptional({
    example: 32000.0,
    description:
      'Override articles cost. If omitted → copied from task_articles totals.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  articlesCost?: number;

  @ApiPropertyOptional({
    example: 8000.0,
    description:
      'Override tools cost. If omitted → copied from task_tools totals.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  toolsCost?: number;
}
