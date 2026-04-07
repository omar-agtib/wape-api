import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('personnel')
export class Personnel extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Karim Benali' })
  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @ApiProperty({ example: 'Chef de chantier' })
  @Column({ type: 'varchar', length: 100 })
  role: string;

  @ApiProperty({ example: 150.0 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'cost_per_hour',
    transformer: DecimalTransformer,
  })
  costPerHour: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiPropertyOptional({ example: 'karim@acme.ma' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  address?: string;
}
