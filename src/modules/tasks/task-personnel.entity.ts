import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Task } from './task.entity';
import { Personnel } from '../personnel/personnel.entity';

@Entity('task_personnel')
export class TaskPersonnel extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'personnel_id' })
  personnelId: string;

  @ApiProperty({ example: 40, description: 'Planned hours' })
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  quantity: number;

  @ApiProperty({ example: 150.00, description: 'Cost per hour — copied from personnel, overridable' })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost', transformer: DecimalTransformer })
  unitCost: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ example: 6000.00, description: 'quantity × unitCost — computed on save' })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_cost', transformer: DecimalTransformer })
  totalCost: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Personnel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;
}