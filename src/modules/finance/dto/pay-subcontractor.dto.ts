import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethodType } from '../../../common/enums';

export class PaySubcontractorDto {
  @ApiProperty({
    example: 42500.0,
    description: 'Amount to pay — must be <= remaining (RG-P01)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiPropertyOptional({ example: 'CHQ-2026-0055' })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}
