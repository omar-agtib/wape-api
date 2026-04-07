import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Project } from './project.entity';

@Entity('project_finance_snapshots')
export class ProjectFinanceSnapshot extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'project_id', unique: true })
  projectId: string;

  @ApiProperty({ example: 2500000 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_budget',
    default: 0,
    transformer: DecimalTransformer,
  })
  totalBudget: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_spent',
    default: 0,
    transformer: DecimalTransformer,
  })
  totalSpent: number;

  @ApiProperty({ example: 2500000 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'remaining_budget',
    default: 0,
    transformer: DecimalTransformer,
  })
  remainingBudget: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'spent_personnel',
    default: 0,
    transformer: DecimalTransformer,
  })
  spentPersonnel: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'spent_articles',
    default: 0,
    transformer: DecimalTransformer,
  })
  spentArticles: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'spent_tools',
    default: 0,
    transformer: DecimalTransformer,
  })
  spentTools: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'last_updated_at' })
  lastUpdatedAt: Date;

  @OneToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
