import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { SupportTicket } from './support-ticket.entity';

@Entity('ticket_messages')
export class TicketMessage extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'sender_id' })
  senderId: string;

  @ApiProperty({ example: 'Voici la solution à votre problème...' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ description: 'TRUE if sent by a support agent (admin)' })
  @Column({ type: 'boolean', name: 'is_support_agent', default: false })
  isSupportAgent: boolean;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'sent_at', default: () => 'NOW()' })
  sentAt: Date;

  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;
}
