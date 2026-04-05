import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import {
  BillingType, SubscriptionPlan,
  SubscriptionStatus, PaymentMethodType,
} from '../../../common/enums';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity('subscriptions')
export class Subscription extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id', unique: true })
  tenantId: string;

  @ApiProperty({ example: 'ACME Construction' })
  @Column({ type: 'varchar', length: 255, name: 'company_name' })
  companyName: string;

  @ApiProperty({ enum: BillingType })
  @Column({ type: 'enum', enum: BillingType, name: 'billing_type' })
  billingType: BillingType;

  @ApiProperty({ enum: SubscriptionPlan })
  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.STARTER })
  plan: SubscriptionPlan;

  @ApiProperty({ example: 1500.00 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    transformer: DecimalTransformer,
  })
  price: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty()
  @Column({ type: 'date', name: 'billing_start_date' })
  billingStartDate: string;

  @ApiProperty({ description: 'Auto-calculated: billingStartDate + 1 month or 1 year' })
  @Column({ type: 'date', name: 'next_billing_date' })
  nextBillingDate: string;

  @ApiProperty({ enum: PaymentMethodType })
  @Column({ type: 'enum', enum: PaymentMethodType, name: 'payment_method' })
  paymentMethod: PaymentMethodType;

  @ApiProperty({ enum: SubscriptionStatus })
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
  status: SubscriptionStatus;

  @ApiProperty({ description: 'TRUE after 7 days past expiry — blocks premium routes (RG-P06)' })
  @Column({ type: 'boolean', name: 'access_restricted', default: false })
  accessRestricted: boolean;
}