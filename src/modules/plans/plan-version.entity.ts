import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Plan } from './plan.entity';

@Entity('plan_versions')
export class PlanVersion extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'numero_version' })
  numeroVersion: number;

  @ApiProperty()
  @Column({ type: 'text', name: 'file_url' })
  fileUrl: string;

  @ApiProperty({ example: 'pdf' })
  @Column({ type: 'varchar', length: 10, name: 'file_type' })
  fileType: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', name: 'commentaire_version', nullable: true })
  commentaireVersion?: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
