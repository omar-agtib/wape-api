import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('tutorials')
export class Tutorial extends BaseEntity {
  @ApiProperty({ example: 'Comment créer un projet dans WAPE' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 'Guide de démarrage' })
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @ApiProperty({ description: 'HTML or Markdown content' })
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', name: 'video_url', nullable: true })
  videoUrl?: string;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex: number;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  published: boolean;

  @ApiProperty({ description: 'Admin user who created this tutorial' })
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;
}
