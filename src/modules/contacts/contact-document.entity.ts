import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Contact } from './contact.entity';

export type ContactDocumentType = 'contract' | 'agreement' | 'legal' | 'other';

@Entity('contact_documents')
export class ContactDocument extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'contact_id' })
  contactId: string;

  @ApiProperty({ example: 'Contrat-cadre-2026.pdf' })
  @Column({ type: 'varchar', length: 255, name: 'document_name' })
  documentName: string;

  @ApiProperty({
    example: 'contract',
    enum: ['contract', 'agreement', 'legal', 'other'],
  })
  @Column({ type: 'varchar', length: 50, name: 'document_type' })
  documentType: ContactDocumentType;

  @ApiProperty({ description: 'S3 file URL' })
  @Column({ type: 'text', name: 'file_url' })
  fileUrl: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'uploaded_at', default: () => 'NOW()' })
  uploadedAt: Date;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;
}
