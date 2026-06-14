import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReceiveDto {
  @ApiProperty({
    example: 80,
    description: 'Quantity being received. Must be > 0 and <= remaining (RG04)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  receivedQuantity: number;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Quantity rejected on receipt — recorded for audit, not added to stock',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rejectedQuantity?: number;

  @ApiPropertyOptional({
    example: 'Partial delivery — rest expected next week',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-user',
    description: 'Who received the goods',
  })
  @IsOptional()
  @IsString()
  receivedBy?: string;

  @ApiPropertyOptional({ description: 'Free-text receiver name' })
  @IsOptional()
  @IsString()
  receivedByName?: string;
}
