import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { OperateurStatut, TypeContratOperateur } from '../../common/enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('operateurs')
export class Operateur extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Ahmed Benali' })
  @Column({ type: 'varchar', length: 255, name: 'nom_complet' })
  nomComplet: string;

  @ApiPropertyOptional({ example: 'AB123456' })
  @Column({ type: 'varchar', length: 20, nullable: true, unique: false })
  cin?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 30, nullable: true })
  telephone?: string;

  @ApiProperty({ enum: TypeContratOperateur })
  @Column({
    type: 'enum',
    enum: TypeContratOperateur,
    name: 'type_contrat',
    default: TypeContratOperateur.CDD,
  })
  typeContrat: TypeContratOperateur;

  @ApiPropertyOptional({ example: 250.0, description: 'Taux journalier (MAD)' })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'taux_journalier',
    nullable: true,
    transformer: DecimalTransformer,
  })
  tauxJournalier?: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiProperty({ enum: OperateurStatut })
  @Column({
    type: 'enum',
    enum: OperateurStatut,
    default: OperateurStatut.ACTIF,
  })
  statut: OperateurStatut;

  @ApiPropertyOptional({ description: "Projet actuel d'affectation" })
  @Column({ type: 'uuid', name: 'projet_actuel_id', nullable: true })
  projetActuelId?: string;
}
