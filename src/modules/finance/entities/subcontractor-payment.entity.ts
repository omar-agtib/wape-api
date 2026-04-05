import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PaymentMethodType, PaymentStatus } from '../../../common/enums';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity('subcontractor_payments')
export class SubcontractorPayment extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Must be contact_type=subcontractor' })
  @Column({ type: 'uuid', name: 'subcontractor_id' })
  subcontractorId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ApiPropertyOptional({ description: 'Specific task this payment covers' })
  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId?: string;

  @ApiPropertyOptional({ description: 'WAPE invoice linked to this payment' })
  @Column({ type: 'uuid', name: 'invoice_id', nullable: true })
  invoiceId?: string;

  @ApiProperty({ example: 85000.0, description: 'Total contractual amount' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'contract_amount',
    transformer: DecimalTransformer,
  })
  contractAmount: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'amount_paid',
    default: 0,
    transformer: DecimalTransformer,
  })
  amountPaid: number;

  @ApiProperty({ example: 85000.0, description: 'contractAmount - amountPaid' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'remaining_amount',
    default: 0,
    transformer: DecimalTransformer,
  })
  remainingAmount: number;

  @ApiPropertyOptional()
  @Column({ type: 'date', name: 'payment_date', nullable: true })
  paymentDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    name: 'payment_method',
    nullable: true,
  })
  paymentMethod?: PaymentMethodType;

  @ApiProperty({ enum: PaymentStatus })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;
}
