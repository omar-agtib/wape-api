import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { NonConformity } from './non-conformity.entity';

@Entity('nc_images')
export class NcImage extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'nc_id' })
  ncId: string;

  @ApiProperty({ description: 'S3 URL (signed URL returned on GET)' })
  @Column({ type: 'text', name: 'image_url' })
  imageUrl: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'uploaded_at', default: () => 'NOW()' })
  uploadedAt: Date;

  @ManyToOne(() => NonConformity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nc_id' })
  nonConformity: NonConformity;
}
