import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../../common/enums';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const exists = await this.repo.findOne({
      where: { tenantId: input.tenantId, email: input.email },
    });
    if (exists) {
      throw new ConflictException({
        error: 'EMAIL_ALREADY_EXISTS',
        message: `Email '${input.email}' is already registered`,
        field: 'email',
      });
    }

    const user = this.repo.create({
      tenantId: input.tenantId,
      email: input.email,
      passwordHash: input.password,
      fullName: input.fullName,
      role: input.role ?? UserRole.VIEWER,
      isActive: true,
    });

    return this.repo.save(user);
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<User | null> {
    return this.repo.findOne({ where: { email, tenantId, isActive: true } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: `User not found`,
      });
    }
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }

  // ── Team management ──────────────────────────────────────────────────────────

  async listByTenant(tenantId: string): Promise<User[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
      select: [
        'id',
        'email',
        'fullName',
        'role',
        'isActive',
        'createdAt',
        'lastLoginAt',
      ],
    });
  }

  async invite(tenantId: string, dto: InviteUserDto): Promise<User> {
    const existing = await this.repo.findOne({
      where: { email: dto.email, tenantId },
    });
    if (existing) {
      throw new ConflictException({
        error: 'USER_ALREADY_EXISTS',
        message: `A user with email '${dto.email}' already exists in this company`,
        field: 'email',
      });
    }

    // Admin cannot invite another admin (enforce single admin per tenant)
    if (dto.role === UserRole.ADMIN) {
      const adminExists = await this.repo.findOne({
        where: { tenantId, role: UserRole.ADMIN },
      });
      if (adminExists) {
        throw new ConflictException({
          error: 'ADMIN_ALREADY_EXISTS',
          message:
            'Only one admin is allowed per company. Assign a different role.',
          field: 'role',
        });
      }
    }

    const user = this.repo.create({
      tenantId,
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
    });

    user.passwordHash = dto.password;
    return this.repo.save(user);
  }

  async updateUser(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.repo.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: `User '${userId}' not found`,
      });
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.role !== undefined) {
      if (dto.role === UserRole.ADMIN) {
        throw new ForbiddenException({
          error: 'CANNOT_ASSIGN_ADMIN',
          message: 'Admin role cannot be assigned after account creation',
        });
      }
      user.role = dto.role;
    }

    return this.repo.save(user);
  }

  async deactivate(
    tenantId: string,
    userId: string,
    requesterId: string,
  ): Promise<User> {
    if (userId === requesterId) {
      throw new ForbiddenException({
        error: 'CANNOT_DEACTIVATE_SELF',
        message: 'You cannot deactivate your own account',
      });
    }
    return this.updateUser(tenantId, userId, { isActive: false });
  }
}
