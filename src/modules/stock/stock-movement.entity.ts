import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { StockMovementType } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';


@Entity('stock_movements')
export class StockMovement extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'article_id' })
  articleId: string;

  @ApiProperty({ enum: StockMovementType })
  @Column({ type: 'enum', enum: StockMovementType, name: 'movement_type' })
  movementType: StockMovementType;

  @ApiProperty({ example: 50 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    transformer: DecimalTransformer,
  })
  quantity: number;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'purchase_order_id', nullable: true })
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'responsible_id', nullable: true })
  responsibleId?: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'movement_date', default: () => 'NOW()' })
  movementDate: Date;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;
}