import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { TaskStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('tasks')
export class Task extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ApiProperty({ example: 'Fondations Bloc A' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty()
  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @ApiProperty()
  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @ApiProperty({ enum: TaskStatus })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PLANNED })
  status: TaskStatus;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: DecimalTransformer,
  })
  progress: number;

  @ApiProperty({
    example: 0,
    description: 'Auto-computed from personnel + articles + tools costs',
  })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'estimated_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  estimatedCost: number;

  @ApiPropertyOptional({ description: 'Manually overridable actual cost' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'actual_cost',
    nullable: true,
    transformer: DecimalTransformer,
  })
  actualCost?: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;
}
