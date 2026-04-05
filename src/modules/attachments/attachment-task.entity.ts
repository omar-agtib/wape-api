import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Attachment } from './attachment.entity';

@Entity('attachment_tasks')
export class AttachmentTask extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'attachment_id' })
  attachmentId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Attachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attachment_id' })
  attachment: Attachment;
}
