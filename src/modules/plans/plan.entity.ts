import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { PlanCategorie, PlanStatut } from '../../common/enums';

@Entity('plans')
export class Plan extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @ApiProperty({ example: 'Plan RDC — Bâtiment A' })
  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @ApiPropertyOptional({ example: 'PL-2026-001' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: PlanCategorie })
  @Column({
    type: 'enum',
    enum: PlanCategorie,
    default: PlanCategorie.GENERAL,
  })
  categorie: PlanCategorie;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'version_actuelle', default: 1 })
  versionActuelle: number;

  @ApiProperty({ description: 'URL Cloudinary du plan actuel' })
  @Column({ type: 'text', name: 'file_url' })
  fileUrl: string;

  @ApiProperty({ example: 'pdf', enum: ['png', 'jpg', 'jpeg', 'pdf'] })
  @Column({ type: 'varchar', length: 10, name: 'file_type' })
  fileType: string;

  @ApiPropertyOptional({
    description: 'Largeur image en pixels (pour calcul marqueurs %)',
  })
  @Column({ type: 'int', name: 'largeur_px', nullable: true })
  largeurPx?: number;

  @ApiPropertyOptional({ description: 'Hauteur image en pixels' })
  @Column({ type: 'int', name: 'hauteur_px', nullable: true })
  hauteurPx?: number;

  @ApiProperty({ enum: PlanStatut })
  @Column({ type: 'enum', enum: PlanStatut, default: PlanStatut.ACTIF })
  statut: PlanStatut;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;
}
