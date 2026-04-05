import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { DocSourceType } from '../../common/enums';

@Entity('documents')
export class Document extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ enum: DocSourceType })
  @Column({ type: 'enum', enum: DocSourceType, name: 'source_type' })
  sourceType: DocSourceType;

  @ApiProperty({
    description: 'Polymorphic reference — ID of the source entity',
  })
  @Column({ type: 'uuid', name: 'source_id' })
  sourceId: string;

  @ApiProperty({ example: 'Plan-execution-Bloc-A.pdf' })
  @Column({ type: 'varchar', length: 255, name: 'document_name' })
  documentName: string;

  @ApiProperty({ description: 'S3 file URL' })
  @Column({ type: 'text', name: 'file_url' })
  fileUrl: string;

  @ApiProperty({
    example: 'pdf',
    enum: ['pdf', 'image', 'xlsx', 'docx', 'other'],
  })
  @Column({ type: 'varchar', length: 50, name: 'file_type' })
  fileType: string;

  @ApiProperty({ example: 2048576, description: 'File size in bytes' })
  @Column({ type: 'bigint', name: 'file_size' })
  fileSize: number;

  @ApiProperty({ description: 'User who uploaded the document' })
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'uploaded_at', default: () => 'NOW()' })
  uploadedAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;
}
