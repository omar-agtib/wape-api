import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CURRENCIES } from '../../../common/enums';

export class CreatePoLineDto {
  @ApiProperty({ example: 'uuid-of-article' })
  @IsUUID()
  articleId: string;

  @ApiProperty({ example: 200, description: 'Quantity to order' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  orderedQuantity: number;

  @ApiProperty({ example: 82.5, description: 'Negotiated unit price' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({
    example: 'uuid-of-supplier-contact',
    description: 'Must be a contact with contactType=supplier (RG08)',
  })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({
    example: 'uuid-of-project',
    description: 'Optional project link (C8)',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiPropertyOptional({ example: 'Urgence chantier Bloc A' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreatePoLineDto],
    description: 'At least one line required',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoLineDto)
  lines: CreatePoLineDto[];
}
