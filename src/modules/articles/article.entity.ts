import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('articles')
export class Article extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Ciment Portland CPJ 45' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'Matériaux de construction' })
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @ApiPropertyOptional({ example: 'Sac 50kg' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string;

  @ApiProperty({ example: 85.0 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'unit_price',
    transformer: DecimalTransformer,
  })
  unitPrice: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({
    example: 'WAPE-ACME-20260401-A3F9X2',
    description: 'Auto-generated, immutable (RG05)',
  })
  @Column({ type: 'varchar', length: 80, name: 'barcode_id', unique: true })
  barcodeId: string;

  @ApiPropertyOptional({
    description:
      'URL of the generated barcode image (CODE128) stored in Cloudinary',
  })
  @Column({ type: 'text', name: 'barcode_image_url', nullable: true })
  barcodeImageUrl?: string;

  @ApiProperty({ example: 500, description: 'Physical stock on hand' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'stock_quantity',
    default: 0,
    transformer: DecimalTransformer,
  })
  stockQuantity: number;

  @ApiProperty({ example: 0, description: 'Reserved by on_progress tasks' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'reserved_quantity',
    default: 0,
    transformer: DecimalTransformer,
  })
  reservedQuantity: number;

  @ApiProperty({
    example: 0,
    description: 'Cumulative consumed (never decremented)',
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'consumed_quantity',
    default: 0,
    transformer: DecimalTransformer,
  })
  consumedQuantity: number;
}
