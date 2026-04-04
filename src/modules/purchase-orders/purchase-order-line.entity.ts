import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_lines')
export class PurchaseOrderLine extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'purchase_order_id' })
  purchaseOrderId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'article_id' })
  articleId: string;

  @ApiProperty({ example: 200 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    name: 'ordered_quantity', transformer: DecimalTransformer,
  })
  orderedQuantity: number;

  @ApiProperty({ example: 0, description: 'Cumulative received quantity across all receptions' })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    name: 'received_quantity', default: 0,
    transformer: DecimalTransformer,
  })
  receivedQuantity: number;

  @ApiProperty({ example: 82.50 })
  @Column({
    type: 'decimal', precision: 10, scale: 2,
    name: 'unit_price', transformer: DecimalTransformer,
  })
  unitPrice: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ example: 16500.00, description: 'orderedQuantity × unitPrice' })
  @Column({
    type: 'decimal', precision: 15, scale: 2,
    name: 'total_price', transformer: DecimalTransformer,
  })
  totalPrice: number;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;
}