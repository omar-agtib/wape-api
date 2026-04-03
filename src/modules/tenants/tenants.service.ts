import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

export interface CreateTenantInput {
  name: string;
  slug: string;
  defaultCurrency?: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    const exists = await this.repo.findOne({ where: { slug: input.slug } });
    if (exists) {
      throw new ConflictException({
        error: 'SLUG_ALREADY_EXISTS',
        message: `A tenant with slug '${input.slug}' already exists`,
        field: 'slug',
      });
    }

    const slugPrefix = input.slug
      .replace(/[^a-z0-9]/gi, '')
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, '0');

    const tenant = this.repo.create({
      name: input.name,
      slug: input.slug,
      slugPrefix,
      defaultCurrency: input.defaultCurrency ?? 'MAD',
      isActive: true,
    });

    return this.repo.save(tenant);
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException({
        error: 'TENANT_NOT_FOUND',
        message: `Tenant not found`,
      });
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }
}
