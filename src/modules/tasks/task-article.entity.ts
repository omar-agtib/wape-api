import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Task } from './task.entity';
import { Article } from '../articles/article.entity';

@Entity('task_articles')
export class TaskArticle extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'article_id' })
  articleId: string;

  @ApiProperty({ example: 50, description: 'Planned quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  quantity: number;

  @ApiProperty({ example: 85.00 })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost', transformer: DecimalTransformer })
  unitCost: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ example: 4250.00, description: 'quantity × unitCost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_cost', transformer: DecimalTransformer })
  totalCost: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Article, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'article_id' })
  article: Article;
}