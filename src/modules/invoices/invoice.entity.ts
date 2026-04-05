import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { InvoiceStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('invoices')
export class Invoice extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({
    example: 'INV-2026-0001',
    description: 'Auto-generated (INV-YYYY-NNNN)',
  })
  @Column({ type: 'varchar', length: 20, name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @ApiProperty({ description: '1:1 with attachment' })
  @Column({ type: 'uuid', name: 'attachment_id', unique: true })
  attachmentId: string;

  @ApiProperty({ description: 'Subcontractor being invoiced' })
  @Column({ type: 'uuid', name: 'subcontractor_id' })
  subcontractorId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ApiProperty({
    example: 85000.0,
    description: 'Equals attachment.totalCost — immutable (RG14)',
  })
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

  @ApiProperty({ enum: InvoiceStatus })
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING_VALIDATION,
  })
  status: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'S3 URL — populated when invoice is validated (W8)',
  })
  @Column({ type: 'text', name: 'pdf_url', nullable: true })
  pdfUrl?: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'issued_at', default: () => 'NOW()' })
  issuedAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt?: Date;
}
