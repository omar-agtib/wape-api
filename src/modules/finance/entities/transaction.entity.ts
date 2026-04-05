import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  PaymentMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../common/enums';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @ApiProperty({
    description: 'ID returned by payment gateway (Stripe/PayPal/CMI) — unique',
  })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'transaction_id',
    unique: true,
  })
  transactionId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ enum: TransactionType })
  @Column({ type: 'enum', enum: TransactionType, name: 'payment_type' })
  paymentType: TransactionType;

  @ApiProperty({
    description:
      'ID of the source: subscriptionId | supplierPaymentId | subcontractorPaymentId',
  })
  @Column({ type: 'uuid', name: 'source_id' })
  sourceId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  @ApiProperty({
    example: 'SONASID S.A.',
    description: 'Denormalized beneficiary name for audit',
  })
  @Column({ type: 'varchar', length: 255, name: 'beneficiary_name' })
  beneficiaryName: string;

  @ApiProperty({ example: 1500.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: DecimalTransformer,
  })
  amount: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'payment_date', default: () => 'NOW()' })
  paymentDate: Date;

  @ApiProperty({ enum: PaymentMethodType })
  @Column({ type: 'enum', enum: PaymentMethodType, name: 'payment_method' })
  paymentMethod: PaymentMethodType;

  @ApiProperty({ enum: TransactionStatus })
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ApiPropertyOptional({
    description: 'External reference: cheque number, wire ref, etc.',
  })
  @Column({
    type: 'varchar',
    length: 200,
    name: 'transaction_reference',
    nullable: true,
  })
  transactionReference?: string;

  @ApiPropertyOptional({
    description:
      'Raw gateway response stored as JSONB for audit — NEVER modified (RG-P03)',
  })
  @Column({ type: 'jsonb', name: 'gateway_response', nullable: true })
  gatewayResponse?: object;
}
