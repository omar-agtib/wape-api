import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NonConformity } from './non-conformity.entity';
import { NcImage } from './nc-image.entity';
import { CreateNcDto } from './dto/create-nc.dto';
import { UpdateNcDto } from './dto/update-nc.dto';
import { NcFilterDto } from './dto/nc-filter.dto';
import { AddNcImageDto } from './dto/add-nc-image.dto';
import { UploadPlanDto } from './dto/upload-plan.dto';
import { UpdateNcStatusDto } from './dto/update-nc-status.dto';
import { NcStatus } from '../../common/enums';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { MailService } from '../../shared/mail/mail.service';
import { RealtimeService } from '../../shared/realtime/realtime.service';

const ALLOWED_NC_TRANSITIONS: Record<NcStatus, NcStatus[]> = {
  [NcStatus.OPEN]: [NcStatus.IN_REVIEW, NcStatus.CLOSED],
  [NcStatus.IN_REVIEW]: [NcStatus.CLOSED, NcStatus.OPEN],
  [NcStatus.CLOSED]: [],
};

@Injectable()
export class NonConformitiesService {
  constructor(
    @InjectRepository(NonConformity)
    private readonly ncRepo: Repository<NonConformity>,
    @InjectRepository(NcImage)
    private readonly imageRepo: Repository<NcImage>,
    private readonly mailService: MailService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(
    tenantId: string,
    userId: string,
    dto: CreateNcDto,
  ): Promise<NonConformity> {
    const nc = this.ncRepo.create({
      ...dto,
      tenantId,
      reportedBy: userId,
      status: NcStatus.OPEN,
    });
    const saved = await this.ncRepo.save(nc);

    this.realtimeService.emitNcReported(tenantId, {
      ncId: saved.id,
      ncTitle: saved.title,
      projectId: saved.projectId,
      projectName: saved.projectId, // production: fetch project name
      reportedBy: userId,
      status: saved.status,
    });

    void this.mailService.sendNcReported([], {
      ncId: saved.id,
      ncTitle: saved.title,
      projectName: dto.projectId,
      description: saved.description,
      reportedBy: userId,
      reportedAt: new Date().toLocaleDateString('fr-MA'),
    });

    return saved;
  }

  async findAll(
    tenantId: string,
    filters: NcFilterDto,
  ): Promise<PaginatedResult<NonConformity>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.ncRepo
      .createQueryBuilder('nc')
      .where('nc.tenant_id = :tenantId', { tenantId })
      .andWhere('nc.deleted_at IS NULL');

    if (filters.status)
      qb.andWhere('nc.status = :status', { status: filters.status });
    if (filters.projectId)
      qb.andWhere('nc.project_id = :pid', { pid: filters.projectId });

    qb.orderBy('nc.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const nc = await this.findOneRaw(tenantId, id);
    const images = await this.imageRepo.find({
      where: { ncId: id },
      order: { uploadedAt: 'DESC' },
    });
    // In Sprint 5+ with S3: images would have signed URLs here
    return { ...nc, images };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateNcDto,
  ): Promise<NonConformity> {
    const nc = await this.findOneRaw(tenantId, id);
    Object.assign(nc, dto);
    return this.ncRepo.save(nc);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateNcStatusDto,
  ): Promise<NonConformity> {
    const nc = await this.findOneRaw(tenantId, id);

    if (!ALLOWED_NC_TRANSITIONS[nc.status].includes(dto.status)) {
      throw new UnprocessableEntityException({
        error: 'INVALID_NC_STATUS_TRANSITION',
        message: `Cannot transition NC from '${nc.status}' to '${dto.status}'`,
        details: {
          current: nc.status,
          requested: dto.status,
          allowed: ALLOWED_NC_TRANSITIONS[nc.status],
        },
      });
    }

    await this.ncRepo.update(id, { status: dto.status });
    return this.findOneRaw(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const nc = await this.findOneRaw(tenantId, id);
    await this.ncRepo.softRemove(nc);
  }

  // ── Images ──────────────────────────────────────────────────────────────────

  async addImage(
    tenantId: string,
    ncId: string,
    dto: AddNcImageDto,
  ): Promise<NcImage> {
    await this.findOneRaw(tenantId, ncId);
    const image = this.imageRepo.create({
      ncId,
      imageUrl: dto.imageUrl,
      uploadedAt: new Date(),
    });
    return this.imageRepo.save(image);
  }

  async listImages(tenantId: string, ncId: string): Promise<NcImage[]> {
    await this.findOneRaw(tenantId, ncId);
    return this.imageRepo.find({
      where: { ncId },
      order: { uploadedAt: 'DESC' },
    });
  }

  // ── Plan ────────────────────────────────────────────────────────────────────

  async uploadPlan(
    tenantId: string,
    id: string,
    dto: UploadPlanDto,
  ): Promise<NonConformity> {
    await this.findOneRaw(tenantId, id);
    await this.ncRepo.update(id, {
      planUrl: dto.planUrl,
      ...(dto.markerX !== undefined && { markerX: dto.markerX }),
      ...(dto.markerY !== undefined && { markerY: dto.markerY }),
    });
    return this.findOneRaw(tenantId, id);
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<NonConformity> {
    const nc = await this.ncRepo.findOne({ where: { id, tenantId } });
    if (!nc) {
      throw new NotFoundException({
        error: 'NC_NOT_FOUND',
        message: `Non-conformity '${id}' not found`,
      });
    }
    return nc;
  }
}
