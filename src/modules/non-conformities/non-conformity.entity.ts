import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { NcStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('non_conformities')
export class NonConformity extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ApiProperty({ example: 'Fissure murale Niveau 3' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: NcStatus })
  @Column({ type: 'enum', enum: NcStatus, default: NcStatus.OPEN })
  status: NcStatus;

  @ApiPropertyOptional({ description: 'S3 URL of site plan (PDF or image)' })
  @Column({ type: 'text', name: 'plan_url', nullable: true })
  planUrl?: string;

  @ApiPropertyOptional({
    example: 42.5,
    description: 'Marker X position (0–100% of plan width)',
  })
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 4,
    name: 'marker_x',
    nullable: true,
    transformer: DecimalTransformer,
  })
  markerX?: number;

  @ApiPropertyOptional({
    example: 67.3,
    description: 'Marker Y position (0–100% of plan height)',
  })
  @Column({
    type: 'decimal',
    precision: 8,
    scale: 4,
    name: 'marker_y',
    nullable: true,
    transformer: DecimalTransformer,
  })
  markerY?: number;

  @ApiProperty({ description: 'User who reported the NC' })
  @Column({ type: 'uuid', name: 'reported_by' })
  reportedBy: string;
}
