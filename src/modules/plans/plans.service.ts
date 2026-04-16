import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { PlanVersion } from './plan-version.entity';
import { NonConformity } from '../non-conformities/non-conformity.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { NouvelleVersionDto } from './dto/nouvelle-version.dto';
import { PlanStatut } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanVersion)
    private readonly versionRepo: Repository<PlanVersion>,
    @InjectRepository(NonConformity)
    private readonly ncRepo: Repository<NonConformity>,
  ) {}

  // ── W-PL2: Create plan ─────────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePlanDto,
  ): Promise<Plan> {
    // RG-PL04: reference unique per project
    if (dto.reference) {
      const existing = await this.planRepo.findOne({
        where: { tenantId, projetId: dto.projetId, reference: dto.reference },
      });
      if (existing) {
        throw new ConflictException({
          error: 'REFERENCE_DEJA_EXISTANTE',
          message: `La référence '${dto.reference}' existe déjà pour ce projet (RG-PL04)`,
          field: 'reference',
        });
      }
    }

    const plan = this.planRepo.create({
      ...dto,
      tenantId,
      uploadedBy: userId,
      versionActuelle: 1,
      statut: PlanStatut.ACTIF,
    });
    const saved = await this.planRepo.save(plan);

    // Create version 1 entry
    const version = this.versionRepo.create({
      planId: saved.id,
      numeroVersion: 1,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      commentaireVersion: 'Version initiale',
      uploadedBy: userId,
    });
    await this.versionRepo.save(version);

    return saved;
  }

  async findAll(
    tenantId: string,
    filters: {
      projetId?: string;
      categorie?: string;
      statut?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResult<Plan>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.planRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId });

    if (filters.projetId)
      qb.andWhere('p.projet_id = :pid', { pid: filters.projetId });
    if (filters.categorie)
      qb.andWhere('p.categorie = :cat', { cat: filters.categorie });
    if (filters.statut) qb.andWhere('p.statut = :s', { s: filters.statut });

    qb.orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.planRepo.findOne({ where: { id, tenantId } });
    if (!plan)
      throw new NotFoundException({
        error: 'PLAN_NOT_FOUND',
        message: `Plan '${id}' introuvable`,
      });

    // Count linked NCs
    const ncCount = await this.ncRepo.count({
      where: { planId: id, tenantId },
    });

    return { ...plan, ncCount };
  }

  async findOneRaw(tenantId: string, id: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id, tenantId } });
    if (!plan)
      throw new NotFoundException({
        error: 'PLAN_NOT_FOUND',
        message: `Plan '${id}' introuvable`,
      });
    return plan;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePlanDto,
  ): Promise<Plan> {
    const plan = await this.findOneRaw(tenantId, id);
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  // ── W-PL1: Nouvelle version ────────────────────────────────────────────────

  async nouvelleVersion(
    tenantId: string,
    id: string,
    userId: string,
    dto: NouvelleVersionDto,
  ): Promise<Plan> {
    const plan = await this.findOneRaw(tenantId, id);

    // Archive current version
    const version = this.versionRepo.create({
      planId: plan.id,
      numeroVersion: plan.versionActuelle + 1,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      commentaireVersion: dto.commentaireVersion,
      uploadedBy: userId,
    });
    await this.versionRepo.save(version);

    // Update plan — all NC automatically see new version via FK JOIN
    await this.planRepo.update(id, {
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      versionActuelle: plan.versionActuelle + 1,
      largeurPx: dto.largeurPx,
      hauteurPx: dto.hauteurPx,
    });

    return this.findOneRaw(tenantId, id);
  }

  async getVersions(tenantId: string, planId: string): Promise<PlanVersion[]> {
    await this.findOneRaw(tenantId, planId);
    return this.versionRepo.find({
      where: { planId },
      order: { numeroVersion: 'DESC' },
    });
  }

  // ── RG-PL03: Delete ────────────────────────────────────────────────────────

  async remove(tenantId: string, id: string): Promise<void> {
    const plan = await this.findOneRaw(tenantId, id);

    // Check active NCs
    const activeNcCount = await this.ncRepo
      .createQueryBuilder('nc')
      .where('nc.tenant_id = :tenantId', { tenantId })
      .andWhere('(nc.plan_id = :planId)', { planId: id })
      .andWhere("nc.status IN ('open', 'in_review')")
      .getCount();

    if (activeNcCount > 0) {
      throw new ConflictException({
        error: 'PLAN_HAS_ACTIVE_NC',
        message: `Ce plan est référencé par ${activeNcCount} non-conformité(s) active(s). Résolvez-les d'abord (RG-PL03)`,
        details: { activeNcCount },
      });
    }

    await this.planRepo.remove(plan);
  }

  // ── List NC linked to plan ────────────────────────────────────────────────

  async getNonConformites(tenantId: string, planId: string) {
    await this.findOneRaw(tenantId, planId);
    return this.ncRepo.find({
      where: { planId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Plans by project ──────────────────────────────────────────────────────

  async findByProjet(tenantId: string, projetId: string): Promise<Plan[]> {
    return this.planRepo.find({
      where: { tenantId, projetId, statut: PlanStatut.ACTIF },
      order: { createdAt: 'DESC' },
    });
  }
}
