import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { ContactType } from '../../common/enums';

@Entity('contacts')
export class Contact extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ enum: ContactType })
  @Column({ type: 'enum', enum: ContactType, name: 'contact_type' })
  contactType: ContactType;

  @ApiProperty({ example: 'SONASID S.A.' })
  @Column({ type: 'varchar', length: 255, name: 'legal_name' })
  legalName: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 50, name: 'if_number', nullable: true })
  ifNumber?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 50, name: 'ice_number', nullable: true })
  iceNumber?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  address?: string;
}