import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { PurchaseOrderStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('purchase_orders')
export class PurchaseOrder extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'BC-2026-0001', description: 'Auto-generated (BC-YYYY-NNNN)' })
  @Column({ type: 'varchar', length: 20, name: 'order_number', unique: true })
  orderNumber: string;

  @ApiProperty({ description: 'Must be contact_type=supplier (RG08)' })
  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId: string;

  @ApiPropertyOptional({ description: 'Optional project link (C8)' })
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'order_date', default: () => 'NOW()' })
  orderDate: Date;

  @ApiProperty({ enum: PurchaseOrderStatus })
  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ example: 16500.00, description: 'Sum of all line totals' })
  @Column({
    type: 'decimal', precision: 15, scale: 2,
    name: 'total_amount', default: 0,
    transformer: DecimalTransformer,
  })
  totalAmount: number;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;
}