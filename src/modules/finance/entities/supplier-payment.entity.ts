import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PaymentMethodType, PaymentStatus } from '../../../common/enums';
import { DecimalTransformer } from '../../../common/transformers/decimal.transformer';

@Entity('supplier_payments')
export class SupplierPayment extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Must be contact_type=supplier' })
  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  @ApiProperty({ example: 'FACT-2026-123' })
  @Column({ type: 'varchar', length: 100, name: 'invoice_number' })
  invoiceNumber: string;

  @ApiPropertyOptional({
    description: 'S3 URL of uploaded supplier invoice PDF',
  })
  @Column({ type: 'text', name: 'invoice_file_url', nullable: true })
  invoiceFileUrl?: string;

  @ApiProperty({ example: 50000.0, description: 'Total amount to pay' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: DecimalTransformer,
  })
  amount: number;

  @ApiProperty({ example: 0, description: 'Cumulative amount paid so far' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'amount_paid',
    default: 0,
    transformer: DecimalTransformer,
  })
  amountPaid: number;

  @ApiProperty({
    example: 50000.0,
    description: 'amount - amountPaid (computed in service)',
  })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'remaining_amount',
    default: 0,
    transformer: DecimalTransformer,
  })
  remainingAmount: number;

  @ApiProperty({ example: '2026-05-31' })
  @Column({ type: 'date', name: 'due_date' })
  dueDate: string;

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
