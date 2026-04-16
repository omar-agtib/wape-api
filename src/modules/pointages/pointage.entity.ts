import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { StatutPresence, TypeContratOperateur } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('pointages_journaliers')
export class Pointage extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'operateur_id' })
  operateurId: string;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'tache_id', nullable: true })
  tacheId?: string;

  @ApiProperty({ example: '2026-04-15' })
  @Column({ type: 'date', name: 'date_pointage' })
  datePointage: string;

  @ApiPropertyOptional({ example: '08:00' })
  @Column({ type: 'varchar', length: 5, name: 'heure_debut', nullable: true })
  heureDebut?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @Column({ type: 'varchar', length: 5, name: 'heure_fin', nullable: true })
  heureFin?: string;

  @ApiProperty({
    example: 8.5,
    description: 'Heures calculées automatiquement',
  })
  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    name: 'heures_travaillees',
    default: 0,
    transformer: DecimalTransformer,
  })
  heuresTravaillees: number;

  @ApiProperty({ enum: StatutPresence })
  @Column({ type: 'enum', enum: StatutPresence, name: 'statut_presence' })
  statutPresence: StatutPresence;

  @ApiProperty({ enum: TypeContratOperateur })
  @Column({
    type: 'enum',
    enum: TypeContratOperateur,
    name: 'type_contrat',
    default: TypeContratOperateur.CDD,
  })
  typeContrat: TypeContratOperateur;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  commentaire?: string;

  @ApiProperty({ description: 'TRUE = verrouillé, non modifiable (RG-PT02)' })
  @Column({ type: 'boolean', name: 'is_valide', default: false })
  isValide: boolean;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', name: 'valide_par', nullable: true })
  validePar?: string;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', name: 'valide_le', nullable: true })
  valideLe?: Date;

  @ApiProperty()
  @Column({ type: 'uuid', name: 'saisi_par' })
  saisiPar: string;
}
