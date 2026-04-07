import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethodType } from '../../../common/enums';

export class PaySupplierDto {
  @ApiProperty({
    example: 25000.0,
    description:
      'Partial or full amount to pay. Must be <= remaining (RG-P01).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiPropertyOptional({ example: 'VIR-2026-0042' })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ example: 'https://s3.../receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
