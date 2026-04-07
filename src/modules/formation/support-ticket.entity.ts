import { Column, Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('support_tickets')
export class SupportTicket extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ApiProperty({ example: 'Impossible de créer un bon de commande' })
  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ example: 'open', enum: ['open', 'in_progress', 'closed'] })
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;

  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high', 'urgent'] })
  @Column({ type: 'varchar', length: 10, default: 'medium' })
  priority: string;
}
