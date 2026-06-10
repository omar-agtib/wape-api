import { Column, Entity } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { PersonnelStatus, ContractType } from '../../common/enums';

@Entity('personnel')
export class Personnel extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'Karim Benali' })
  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @ApiProperty({ example: 'Chef de chantier', description: 'Function' })
  @Column({ type: 'varchar', length: 100 })
  role: string;

  @ApiPropertyOptional({ example: 'Senior Engineer', description: 'Job title' })
  @Column({ type: 'varchar', length: 255, name: 'job_title', nullable: true })
  jobTitle?: string;

  @ApiProperty({ enum: PersonnelStatus })
  @Column({
    type: 'enum',
    enum: PersonnelStatus,
    default: PersonnelStatus.ACTIVE,
  })
  status: PersonnelStatus;

  @ApiPropertyOptional({ enum: ContractType })
  @Column({
    type: 'enum',
    enum: ContractType,
    name: 'contract_type',
    nullable: true,
  })
  contractType?: ContractType;

  @ApiPropertyOptional()
  @Column({ type: 'date', name: 'contract_start', nullable: true })
  contractStart?: string;

  @ApiPropertyOptional()
  @Column({ type: 'date', name: 'contract_end', nullable: true })
  contractEnd?: string;

  @ApiPropertyOptional({ example: 48, description: 'Weekly working hours' })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'weekly_hours',
    nullable: true,
    transformer: DecimalTransformer,
  })
  weeklyHours?: number;

  @ApiPropertyOptional({
    example: 8000.0,
    description: 'Salary (informational)',
  })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  salary?: number;

  @ApiPropertyOptional({ description: 'Assigned project' })
  @Column({ type: 'uuid', name: 'assigned_project_id', nullable: true })
  assignedProjectId?: string;

  @ApiProperty({
    example: 150.0,
    description: 'Hourly cost — used in task costing',
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'cost_per_hour',
    transformer: DecimalTransformer,
  })
  costPerHour: number;

  @ApiProperty({ example: 'MAD' })
  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @ApiPropertyOptional({ example: 'karim@acme.ma' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  address?: string;
}
