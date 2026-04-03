import { Column, Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @ApiProperty({ example: 'ACME Construction' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'acme-construction' })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @ApiProperty({ example: 'ACME' })
  @Column({ type: 'varchar', length: 4, name: 'slug_prefix' })
  slugPrefix: string;

  @ApiProperty({ example: 'MAD' })
  @Column({
    type: 'varchar',
    length: 3,
    name: 'default_currency',
    default: 'MAD',
  })
  defaultCurrency: string;

  @ApiProperty()
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
