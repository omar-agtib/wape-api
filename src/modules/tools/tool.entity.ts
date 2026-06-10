import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { ToolStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('tools')
export class Tool extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Grue à tour Liebherr 200T' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'Levage' })
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @ApiPropertyOptional({ example: 'LBH-2024-00123' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'serial_number',
    nullable: true,
  })
  serialNumber?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', name: 'photo_url', nullable: true })
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'Warehouse', description: 'Tool location' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @Column({ type: 'date', name: 'purchase_date', nullable: true })
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 18000.0, description: 'Purchase cost' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'purchase_cost',
    nullable: true,
    transformer: DecimalTransformer,
  })
  purchaseCost?: number;

  @ApiPropertyOptional({ description: 'Assigned project' })
  @Column({ type: 'uuid', name: 'assigned_project_id', nullable: true })
  assignedProjectId?: string;

  @ApiProperty({ enum: ToolStatus, example: ToolStatus.AVAILABLE })
  @Column({ type: 'enum', enum: ToolStatus, default: ToolStatus.AVAILABLE })
  status: ToolStatus;
}
