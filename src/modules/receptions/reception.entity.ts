import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { ReceptionStatus } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('receptions')
export class Reception extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'purchase_order_id' })
  purchaseOrderId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'purchase_order_line_id' })
  purchaseOrderLineId: string;

  @ApiProperty({ description: 'Denormalized for quick queries' })
  @Column({ type: 'uuid', name: 'article_id' })
  articleId: string;

  @ApiProperty({ example: 200 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    name: 'expected_quantity', transformer: DecimalTransformer,
  })
  expectedQuantity: number;

  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    name: 'received_quantity', default: 0,
    transformer: DecimalTransformer,
  })
  receivedQuantity: number;

  @ApiProperty({ enum: ReceptionStatus })
  @Column({ type: 'enum', enum: ReceptionStatus, default: ReceptionStatus.PENDING })
  status: ReceptionStatus;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'received_at', nullable: true })
  receivedAt?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'received_by', nullable: true })
  receivedBy?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes?: string;
}