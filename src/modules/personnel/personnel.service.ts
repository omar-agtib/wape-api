import {
  Injectable, NotFoundException, ConflictException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personnel } from './personnel.entity';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Personnel)
    private readonly repo: Repository<Personnel>,
  ) {}

  async create(tenantId: string, dto: CreatePersonnelDto): Promise<Personnel> {
    if (dto.email) {
      const exists = await this.repo.findOne({
        where: { tenantId, email: dto.email },
        withDeleted: false,
      });
      if (exists) {
        throw new ConflictException({
          error: 'EMAIL_ALREADY_EXISTS',
          message: `Email '${dto.email}' is already registered for a personnel member`,
          field: 'email',
        });
      }
    }

    const personnel = this.repo.create({ ...dto, tenantId });
    return this.repo.save(personnel);
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters: { role?: string; search?: string },
  ): Promise<PaginatedResult<Personnel>> {
    const { page = 1, limit = 20 } = pagination;

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.deleted_at IS NULL');

    if (filters.role) {
      qb.andWhere('p.role ILIKE :role', { role: `%${filters.role}%` });
    }
    if (filters.search) {
      qb.andWhere('(p.full_name ILIKE :search OR p.email ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('p.full_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Personnel> {
    const personnel = await this.repo.findOne({ where: { id, tenantId } });
    if (!personnel) {
      throw new NotFoundException({
        error: 'PERSONNEL_NOT_FOUND',
        message: `Personnel member '${id}' not found`,
      });
    }
    return personnel;
  }

  async update(tenantId: string, id: string, dto: UpdatePersonnelDto): Promise<Personnel> {
    const personnel = await this.findOne(tenantId, id);

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== personnel.email) {
      const exists = await this.repo.findOne({ where: { tenantId, email: dto.email } });
      if (exists) {
        throw new ConflictException({
          error: 'EMAIL_ALREADY_EXISTS',
          message: `Email '${dto.email}' is already in use`,
          field: 'email',
        });
      }
    }

    // NOTE: updating costPerHour here NEVER propagates to existing task_personnel records (RG independence)
    Object.assign(personnel, dto);
    return this.repo.save(personnel);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const personnel = await this.findOne(tenantId, id);
    await this.repo.softRemove(personnel);
  }

  async verifyBelongsToTenant(tenantId: string, id: string): Promise<Personnel> {
    const personnel = await this.repo.findOne({ where: { id, tenantId } });
    if (!personnel) {
      throw new UnprocessableEntityException({
        error: 'CROSS_TENANT_ACCESS',
        message: `Personnel '${id}' does not belong to this tenant`,
      });
    }
    return personnel;
  }
}