import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { ReceptionStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('receptions')
export class Reception extends BaseEntity {
  // ── Tenant (new — needed for manual/PO-less receptions) ────────────────────
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  // ── PO link (now nullable — a manual reception may have no PO) ──────────────
  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'purchase_order_id', nullable: true })
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'purchase_order_line_id', nullable: true })
  purchaseOrderLineId?: string;

  @ApiPropertyOptional({ description: 'Denormalized for quick queries' })
  @Column({ type: 'uuid', name: 'article_id', nullable: true })
  articleId?: string;

  // ── Supplier (auto-filled from PO, or set manually / free-text) ────────────
  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'supplier_id', nullable: true })
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Free-text supplier when not a known record' })
  @Column({ type: 'text', name: 'supplier_name', nullable: true })
  supplierName?: string;

  // ── Project ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  // ── Delivery date ────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '2026-03-10' })
  @Column({ type: 'date', name: 'delivery_date', nullable: true })
  deliveryDate?: string;

  // ── Quantities ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 200 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'expected_quantity',
    nullable: true,
    transformer: DecimalTransformer,
  })
  expectedQuantity?: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'received_quantity',
    default: 0,
    transformer: DecimalTransformer,
  })
  receivedQuantity: number;

  @ApiProperty({
    example: 0,
    description: 'Rejected goods — audit only, not added to stock',
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'rejected_quantity',
    default: 0,
    transformer: DecimalTransformer,
  })
  rejectedQuantity: number;

  @ApiProperty({ enum: ReceptionStatus })
  @Column({
    type: 'enum',
    enum: ReceptionStatus,
    default: ReceptionStatus.PENDING,
  })
  status: ReceptionStatus;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'received_at', nullable: true })
  receivedAt?: Date;

  @ApiPropertyOptional({ description: 'Personnel UUID when a known person is selected' })
  @Column({ type: 'uuid', name: 'received_by', nullable: true })
  receivedBy?: string;

  @ApiPropertyOptional({ description: 'Free-text receiver name (matches the design)' })
  @Column({ type: 'text', name: 'received_by_name', nullable: true })
  receivedByName?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;
}