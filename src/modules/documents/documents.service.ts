import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { DocSourceType } from 'src/common/enums';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateDocumentDto,
  ): Promise<Document> {
    const doc = this.repo.create({
      ...dto,
      tenantId,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });
    return this.repo.save(doc);
  }

  async findAll(
    tenantId: string,
    filters: DocumentFilterDto,
  ): Promise<PaginatedResult<Document>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.deleted_at IS NULL');

    if (filters.sourceType)
      qb.andWhere('d.source_type = :sourceType', {
        sourceType: filters.sourceType,
      });
    if (filters.sourceId)
      qb.andWhere('d.source_id = :sourceId', { sourceId: filters.sourceId });
    if (filters.fileType)
      qb.andWhere('d.file_type = :fileType', { fileType: filters.fileType });
    if (filters.search)
      qb.andWhere('d.document_name ILIKE :search', {
        search: `%${filters.search}%`,
      });

    qb.orderBy('d.uploaded_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<Document> {
    const doc = await this.repo.findOne({ where: { id, tenantId } });
    if (!doc) {
      throw new NotFoundException({
        error: 'DOCUMENT_NOT_FOUND',
        message: `Document '${id}' not found`,
      });
    }
    return doc;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const doc = await this.findOne(tenantId, id);
    await this.repo.softRemove(doc);
  }

  // ── Used by other services (W4 pattern) ─────────────────────────────────────
  async createInternal(
    tenantId: string,
    userId: string,
    sourceType: string,
    sourceId: string,
    documentName: string,
    fileUrl: string,
    fileType: string,
    fileSize: number,
    description?: string,
  ): Promise<Document> {
    const doc = this.repo.create({
      tenantId,
      sourceType: sourceType as DocSourceType,
      sourceId,
      documentName,
      fileUrl,
      fileType,
      fileSize,
      uploadedBy: userId,
      uploadedAt: new Date(),
      description,
    });
    return this.repo.save(doc);
  }
}
