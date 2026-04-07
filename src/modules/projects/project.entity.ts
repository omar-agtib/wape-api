import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { ProjectStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('projects')
export class Project extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Construction Résidence Atlas' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'client_id', nullable: true })
  clientId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: 2500000 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: DecimalTransformer,
  })
  budget: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty()
  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @ApiProperty()
  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @ApiProperty({ enum: ProjectStatus })
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNED })
  status: ProjectStatus;

  @ApiProperty({
    example: 0,
    description: 'Auto-computed: AVG(tasks.progress)',
  })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: DecimalTransformer,
  })
  progress: number;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;
}
