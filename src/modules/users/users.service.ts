import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../../common/enums';

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
}
