import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import {
  BillingType,
  PaymentMethodType,
  SubscriptionPlan,
  SUPPORTED_CURRENCIES,
} from '../../../common/enums';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'ACME Construction' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ enum: BillingType, example: BillingType.MONTHLY })
  @IsEnum(BillingType)
  billingType: BillingType;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.BUSINESS })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ example: 1500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @ApiProperty({ example: 'MAD', enum: ['MAD', 'USD', 'EUR', 'GBP'] })
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiProperty({ example: '2026-04-01', description: 'Billing start date' })
  @IsDateString()
  billingStartDate: string;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;
}
