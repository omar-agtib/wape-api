import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tool } from './tool.entity';

@Entity('tool_movements')
export class ToolMovement extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  @ApiProperty({ example: 'OUT', description: 'IN | OUT' })
  @Column({ type: 'varchar', length: 3, name: 'movement_type' })
  movementType: string;

  @ApiProperty()
  @Column({
    type: 'timestamptz',
    name: 'movement_date',
    default: () => 'NOW()',
  })
  movementDate: Date;

  @ApiProperty({ description: 'Personnel responsible for the movement' })
  @Column({ type: 'uuid', name: 'responsible_id' })
  responsibleId: string;

  @ApiPropertyOptional({
    description: 'Task that triggered this movement (auto movements)',
  })
  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId?: string;

  @ApiProperty({
    description: 'TRUE if triggered automatically by a task status change',
  })
  @Column({ type: 'boolean', name: 'is_auto', default: false })
  isAuto: boolean;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Tool, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;
}
