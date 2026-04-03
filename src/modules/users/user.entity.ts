import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { SoftDeleteEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums';
import { Tenant } from '../tenants/tenant.entity';

@Entity('users')
export class User extends SoftDeleteEntity {
  @ApiProperty()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ example: 'ahmed@acme.ma' })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiHideProperty()
  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @ApiProperty({ example: 'Ahmed Alami' })
  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @ApiProperty()
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  async validatePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }
}
