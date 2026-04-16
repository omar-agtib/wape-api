import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operateur } from './operateur.entity';
import { CreateOperateurDto } from './dto/create-operateur.dto';
import { UpdateOperateurDto } from './dto/update-operateur.dto';
import { OperateurStatut } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

interface OperateurFilters {
  projetId?: string;
  statut?: OperateurStatut;
  typeContrat?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OperateursService {
  constructor(
    @InjectRepository(Operateur)
    private readonly repo: Repository<Operateur>,
  ) {}

  async create(tenantId: string, dto: CreateOperateurDto): Promise<Operateur> {
    // Check CIN uniqueness per tenant
    if (dto.cin) {
      const existing = await this.repo.findOne({
        where: { tenantId, cin: dto.cin },
      });
      if (existing) {
        throw new ConflictException({
          error: 'CIN_ALREADY_EXISTS',
          message: `Un opérateur avec le CIN '${dto.cin}' existe déjà`,
          field: 'cin',
        });
      }
    }

    const operateur = this.repo.create({
      ...dto,
      tenantId,
      currency: dto.currency ?? 'MAD',
      statut: OperateurStatut.ACTIF,
    });
    return this.repo.save(operateur);
  }

  async findAll(
    tenantId: string,
    filters: OperateurFilters,
  ): Promise<PaginatedResult<Operateur>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.statut != :archived', { archived: OperateurStatut.ARCHIVE });

    if (filters.statut)
      qb.andWhere('o.statut = :statut', { statut: filters.statut });
    if (filters.typeContrat)
      qb.andWhere('o.type_contrat = :tc', { tc: filters.typeContrat });
    if (filters.projetId)
      qb.andWhere('o.projet_actuel_id = :pid', { pid: filters.projetId });
    if (filters.search) {
      qb.andWhere('(o.nom_complet ILIKE :s OR o.cin ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    qb.orderBy('o.nom_complet', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Operateur> {
    const op = await this.repo.findOne({ where: { id, tenantId } });
    if (!op)
      throw new NotFoundException({
        error: 'OPERATEUR_NOT_FOUND',
        message: `Opérateur '${id}' introuvable`,
      });
    return op;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateOperateurDto,
  ): Promise<Operateur> {
    const op = await this.findOne(tenantId, id);
    Object.assign(op, dto);
    return this.repo.save(op);
  }
}
