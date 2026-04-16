import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pointage } from './pointage.entity';
import { Operateur } from '../operateurs/operateur.entity';
import { CreatePointageDto } from './dto/create-pointage.dto';
import { UpdatePointageDto } from './dto/update-pointage.dto';
import { StatutPresence, UserRole } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { getDaysInMonth, format, parseISO, differenceInDays } from 'date-fns';

// Helper: calculate hours from HH:MM strings
function calcHeures(
  debut: string,
  fin: string,
  statut: StatutPresence,
): number {
  if (statut === StatutPresence.ABSENT) return 0;
  if (!debut || !fin) {
    if (statut === StatutPresence.DEMI_JOURNEE) return 4.0;
    return 0;
  }
  const [dh, dm] = debut.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  const minutes = fh * 60 + fm - (dh * 60 + dm);
  if (minutes <= 0) return 0;
  return Math.round((minutes / 60) * 100) / 100;
}

interface PointageFilters {
  datePointage?: string;
  operateurId?: string;
  projetId?: string;
  statutPresence?: StatutPresence;
  isValide?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class PointagesService {
  constructor(
    @InjectRepository(Pointage)
    private readonly repo: Repository<Pointage>,
    @InjectRepository(Operateur)
    private readonly opRepo: Repository<Operateur>,
  ) {}

  // ── W-PT1: Create pointage ─────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    role: UserRole,
    dto: CreatePointageDto,
  ): Promise<Pointage> {
    // RG-PT07: date cannot be in future
    const today = format(new Date(), 'yyyy-MM-dd');
    if (dto.datePointage > today) {
      throw new UnprocessableEntityException({
        error: 'DATE_IN_FUTURE',
        message: 'La date de pointage ne peut pas être dans le futur (RG-PT07)',
        field: 'datePointage',
      });
    }

    // RG-PT06: if absent → no time fields
    if (dto.statutPresence === StatutPresence.ABSENT) {
      if (dto.heureDebut || dto.heureFin) {
        throw new UnprocessableEntityException({
          error: 'ABSENT_WITH_HOURS',
          message:
            "Un pointage absent ne peut pas avoir d'heures de début/fin (RG-PT06)",
        });
      }
    }

    // RG-PT03: heure_fin > heure_debut
    if (dto.heureDebut && dto.heureFin) {
      const [dh, dm] = dto.heureDebut.split(':').map(Number);
      const [fh, fm] = dto.heureFin.split(':').map(Number);
      if (fh * 60 + fm <= dh * 60 + dm) {
        throw new UnprocessableEntityException({
          error: 'INVALID_HOURS',
          message: 'heure_fin doit être supérieure à heure_debut (RG-PT03)',
          field: 'heureFin',
        });
      }
    }

    // RG-PT01: uniqueness per operateur + date
    const existing = await this.repo.findOne({
      where: {
        tenantId,
        operateurId: dto.operateurId,
        datePointage: dto.datePointage,
      },
    });
    if (existing) {
      throw new ConflictException({
        error: 'POINTAGE_DEJA_EXISTANT',
        message: `Cet opérateur a déjà un pointage pour le ${dto.datePointage} (RG-PT01)`,
        details: { existingId: existing.id },
      });
    }

    // Verify operateur belongs to tenant
    const operateur = await this.opRepo.findOne({
      where: { id: dto.operateurId, tenantId },
    });
    if (!operateur) {
      throw new NotFoundException({
        error: 'OPERATEUR_NOT_FOUND',
        message: 'Opérateur introuvable',
      });
    }

    const heuresTravaillees = calcHeures(
      dto.heureDebut ?? '',
      dto.heureFin ?? '',
      dto.statutPresence,
    );

    const pointage = this.repo.create({
      ...dto,
      tenantId,
      saisiPar: userId,
      heuresTravaillees,
      typeContrat: dto.typeContrat ?? operateur.typeContrat,
      isValide: false,
    });

    return this.repo.save(pointage);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    filters: PointageFilters,
  ): Promise<PaginatedResult<Pointage>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId });

    if (filters.datePointage)
      qb.andWhere('p.date_pointage = :d', { d: filters.datePointage });
    if (filters.operateurId)
      qb.andWhere('p.operateur_id = :oid', { oid: filters.operateurId });
    if (filters.projetId)
      qb.andWhere('p.projet_id = :pid', { pid: filters.projetId });
    if (filters.statutPresence)
      qb.andWhere('p.statut_presence = :sp', { sp: filters.statutPresence });
    if (filters.isValide !== undefined)
      qb.andWhere('p.is_valide = :v', { v: filters.isValide });

    qb.orderBy('p.date_pointage', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Pointage> {
    const p = await this.repo.findOne({ where: { id, tenantId } });
    if (!p)
      throw new NotFoundException({
        error: 'POINTAGE_NOT_FOUND',
        message: `Pointage '${id}' introuvable`,
      });
    return p;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    tenantId: string,
    id: string,
    userId: string,
    role: UserRole,
    dto: UpdatePointageDto,
  ): Promise<Pointage> {
    const pointage = await this.findOne(tenantId, id);

    // RG-PT02: locked pointage cannot be modified
    if (pointage.isValide) {
      throw new ForbiddenException({
        error: 'POINTAGE_VERROUILLE',
        message:
          'Ce pointage est validé et ne peut plus être modifié (RG-PT02)',
      });
    }

    // RG-PT08: beyond 7 days requires admin
    const daysDiff = differenceInDays(
      new Date(),
      parseISO(pointage.datePointage),
    );
    if (daysDiff > 7 && role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        error: 'MODIFICATION_TARDIVE',
        message:
          "La modification d'un pointage au-delà de 7 jours nécessite le rôle admin (RG-PT08)",
      });
    }

    Object.assign(pointage, dto);

    // Recalculate hours
    pointage.heuresTravaillees = calcHeures(
      pointage.heureDebut ?? '',
      pointage.heureFin ?? '',
      pointage.statutPresence,
    );

    return this.repo.save(pointage);
  }

  // ── W-PT2: Validate ───────────────────────────────────────────────────────

  async valider(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<Pointage> {
    const pointage = await this.findOne(tenantId, id);

    if (pointage.isValide) {
      throw new ConflictException({
        error: 'POINTAGE_DEJA_VALIDE',
        message: 'Ce pointage est déjà validé',
      });
    }

    await this.repo.update(id, {
      isValide: true,
      validePar: userId,
      valideLe: new Date(),
    });

    return this.findOne(tenantId, id);
  }

  // ── Calendrier mensuel ─────────────────────────────────────────────────────

  async getCalendrier(
    tenantId: string,
    operateurId: string,
    mois: number,
    annee: number,
    projetId?: string,
  ) {
    const operateur = await this.opRepo.findOne({
      where: { id: operateurId, tenantId },
    });
    if (!operateur)
      throw new NotFoundException({ error: 'OPERATEUR_NOT_FOUND' });

    const monthPrefix = `${annee}-${String(mois).padStart(2, '0')}`;
    const totalJoursMois = getDaysInMonth(new Date(annee, mois - 1, 1));

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.operateur_id = :oid', { oid: operateurId })
      .andWhere('p.date_pointage LIKE :prefix', { prefix: `${monthPrefix}%` });

    if (projetId) qb.andWhere('p.projet_id = :pid', { pid: projetId });

    const pointages = await qb.getMany();
    const byDate = new Map(pointages.map((p) => [p.datePointage, p]));

    // Build full calendar — every day of month
    const jours = Array.from({ length: totalJoursMois }, (_, i) => {
      const day = i + 1;
      const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const p = byDate.get(dateStr);

      return {
        date: dateStr,
        statut: p?.statutPresence ?? 'aucun_pointage',
        heuresTravaillees: p?.heuresTravaillees ?? 0,
        pointageId: p?.id ?? null,
        isValide: p?.isValide ?? false,
        heureDebut: p?.heureDebut ?? null,
        heureFin: p?.heureFin ?? null,
        commentaire: p?.commentaire ?? null,
      };
    });

    // Monthly stats
    const statistiques = {
      totalJoursTravailles: pointages.filter(
        (p) =>
          p.statutPresence === StatutPresence.PRESENT ||
          p.statutPresence === StatutPresence.DEMI_JOURNEE,
      ).length,
      totalAbsences: pointages.filter(
        (p) => p.statutPresence === StatutPresence.ABSENT,
      ).length,
      totalRetards: pointages.filter(
        (p) => p.statutPresence === StatutPresence.RETARD,
      ).length,
      totalDemiJournees: pointages.filter(
        (p) => p.statutPresence === StatutPresence.DEMI_JOURNEE,
      ).length,
      totalHeuresTravaillees: pointages.reduce(
        (s, p) => s + p.heuresTravaillees,
        0,
      ),
    };

    return {
      operateur: {
        id: operateur.id,
        nomComplet: operateur.nomComplet,
        typeContrat: operateur.typeContrat,
      },
      mois,
      annee,
      totalJoursMois,
      jours,
      statistiques,
    };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(
    tenantId: string,
    projetId?: string,
    mois?: number,
    annee?: number,
  ) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId });

    if (projetId) qb.andWhere('p.projet_id = :pid', { pid: projetId });
    if (mois && annee) {
      const prefix = `${annee}-${String(mois).padStart(2, '0')}`;
      qb.andWhere('p.date_pointage LIKE :prefix', { prefix: `${prefix}%` });
    }

    const all = await qb.getMany();
    const todayPointages = all.filter((p) => p.datePointage === today);

    return {
      today: {
        presents: todayPointages.filter(
          (p) => p.statutPresence === StatutPresence.PRESENT,
        ).length,
        absents: todayPointages.filter(
          (p) => p.statutPresence === StatutPresence.ABSENT,
        ).length,
        retards: todayPointages.filter(
          (p) => p.statutPresence === StatutPresence.RETARD,
        ).length,
        heures: todayPointages.reduce((s, p) => s + p.heuresTravaillees, 0),
        enAttente: todayPointages.filter((p) => !p.isValide).length,
      },
      period: {
        totalPointages: all.length,
        totalHeures: all.reduce((s, p) => s + p.heuresTravaillees, 0),
        tauxPresence:
          all.length > 0
            ? Math.round(
                (all.filter((p) => p.statutPresence !== StatutPresence.ABSENT)
                  .length /
                  all.length) *
                  100,
              )
            : 0,
      },
    };
  }
}
