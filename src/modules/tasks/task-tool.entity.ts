import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Task } from './task.entity';
import { Tool } from '../tools/tool.entity';

@Entity('task_tools')
export class TaskTool extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  @ApiProperty({ example: 5, description: 'Days / units of tool usage' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
  })
  quantity: number;

  @ApiProperty({
    example: 1200.0,
    description: 'Daily cost — overridable, default 0',
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'unit_cost',
    default: 0,
    transformer: DecimalTransformer,
  })
  unitCost: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ example: 6000.0, description: 'quantity × unitCost' })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_cost',
    transformer: DecimalTransformer,
  })
  totalCost: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Tool, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;
}
