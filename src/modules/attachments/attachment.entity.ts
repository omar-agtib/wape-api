import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { AttachmentStatus, AttachmentType } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('attachments')
export class Attachment extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ApiPropertyOptional({
    description: 'NULL = internal attachment (no invoice)',
  })
  @Column({ type: 'uuid', name: 'subcontractor_id', nullable: true })
  subcontractorId?: string;

  @ApiProperty({ example: 'Attachement Gros Œuvre Bloc A' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ enum: AttachmentStatus })
  @Column({
    type: 'enum',
    enum: AttachmentStatus,
    default: AttachmentStatus.DRAFT,
  })
  status: AttachmentStatus;

  @ApiProperty({ enum: AttachmentType })
  @Column({
    type: 'enum',
    enum: AttachmentType,
    name: 'attachment_type',
    default: AttachmentType.EXTERNAL,
  })
  attachmentType: AttachmentType;

  @ApiProperty({ example: 45000.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'personnel_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  personnelCost: number;

  @ApiProperty({ example: 32000.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'articles_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  articlesCost: number;

  @ApiProperty({ example: 8000.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'tools_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  toolsCost: number;

  @ApiProperty({
    example: 85000.0,
    description: 'personnelCost + articlesCost + toolsCost',
  })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  totalCost: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'confirmed_by', nullable: true })
  confirmedBy?: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;
}
