import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// A manual reception line (only used when no PO is linked, or to override).
export class CreateReceptionLineDto {
  @ApiProperty({ description: 'Article being received' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 50, description: 'Quantity expected on this line' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  expectedQuantity: number;

  @ApiPropertyOptional({ example: 50, description: 'Quantity received now' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  receivedQuantity?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Quantity rejected (audit only)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rejectedQuantity?: number;
}

export class CreateReceptionDto {
  @ApiPropertyOptional({
    description: 'Link to a PO. When set, lines auto-fill from the PO.',
  })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'Known supplier record' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Free-text supplier when not a known record',
  })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ description: 'Project the goods are for' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: 'Free-text receiver name' })
  @IsOptional()
  @IsString()
  receivedByName?: string;

  @ApiPropertyOptional({
    description: 'Personnel UUID when a known person is selected',
  })
  @IsOptional()
  @IsUUID()
  receivedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreateReceptionLineDto],
    description:
      'Manual lines. Optional — omit for a header-only reception, or when a PO will supply the lines.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionLineDto)
  lines?: CreateReceptionLineDto[];
}
