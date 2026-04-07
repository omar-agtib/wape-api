import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { ToolStatus } from '../../common/enums';

@Entity('tools')
export class Tool extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Grue à tour Liebherr 200T' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'Levage' })
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @ApiPropertyOptional({ example: 'LBH-2024-00123' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'serial_number',
    nullable: true,
  })
  serialNumber?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', name: 'photo_url', nullable: true })
  photoUrl?: string;

  @ApiProperty({ enum: ToolStatus, example: ToolStatus.AVAILABLE })
  @Column({ type: 'enum', enum: ToolStatus, default: ToolStatus.AVAILABLE })
  status: ToolStatus;
}
