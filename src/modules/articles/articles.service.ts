import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import {
  PaginationDto,
  paginate,
  PaginatedResult,
} from '../../common/dto/pagination.dto';

import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly repo: Repository<Article>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateArticleDto,
  ): Promise<Article & { availableQuantity: number }> {
    const barcodeId = this.generateBarcodeId(tenantId);

    const article = this.repo.create({
      ...dto,
      tenantId,
      barcodeId,
      barcodeImageUrl: undefined,
      stockQuantity: dto.initialStock ?? 0,
      reservedQuantity: 0,
      consumedQuantity: 0,
    });

    const saved = await this.repo.save(article);

    // Generate barcode image async — don't block the response
    void this.generateAndUploadBarcode(saved, tenantId);

    return this.withComputed(saved);
  }

  private async generateAndUploadBarcode(
    article: Article,
    tenantId: string,
  ): Promise<void> {
    try {
      const bwipjs = await import('bwip-js');

      // Generate CODE128 barcode as PNG buffer
      const pngBuffer: Buffer = await new Promise((resolve, reject) => {
        bwipjs.toBuffer(
          {
            bcid: 'code128',
            text: article.barcodeId,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
          },
          (err, png) => {
            if (err)
              reject(err instanceof Error ? err : new Error(String(err)));
            else resolve(png);
          },
        );
      });

      // Upload to Cloudinary
      const result = await this.cloudinaryService.uploadBuffer(
        pngBuffer,
        `barcode-${article.id}`,
        'barcodes',
        tenantId,
      );

      // Update article with Cloudinary URL
      await this.repo.update(article.id, {
        barcodeImageUrl: result.secureUrl,
      });

      console.log(
        `Barcode generated for article ${article.name}: ${result.secureUrl}`,
      );
    } catch (err) {
      console.error(
        `Barcode generation failed for article ${article.id}:`,
        err,
      );
      // Non-fatal — article is still usable without barcode image
    }
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters: { category?: string; search?: string },
  ): Promise<PaginatedResult<Article & { availableQuantity: number }>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.deleted_at IS NULL');

    if (filters.category)
      qb.andWhere('a.category ILIKE :cat', { cat: `%${filters.category}%` });
    if (filters.search)
      qb.andWhere('a.name ILIKE :search', { search: `%${filters.search}%` });

    qb.orderBy('a.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();

    return paginate(
      items.map((a) => this.withComputed(a)),
      total,
      page,
      limit,
    );
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<Article & { availableQuantity: number }> {
    const article = await this.repo.findOne({ where: { id, tenantId } });
    if (!article) {
      throw new NotFoundException({
        error: 'ARTICLE_NOT_FOUND',
        message: `Article '${id}' not found`,
      });
    }
    return this.withComputed(article);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateArticleDto,
  ): Promise<Article & { availableQuantity: number }> {
    const article = await this.findOneRaw(tenantId, id);
    Object.assign(article, dto);
    const saved = await this.repo.save(article);
    return this.withComputed(saved);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const article = await this.findOneRaw(tenantId, id);
    await this.repo.softRemove(article);
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  async findOneRaw(tenantId: string, id: string): Promise<Article> {
    const article = await this.repo.findOne({ where: { id, tenantId } });
    if (!article) {
      throw new NotFoundException({
        error: 'ARTICLE_NOT_FOUND',
        message: `Article '${id}' not found`,
      });
    }
    return article;
  }

  /** Used by W1 — check and reserve stock */
  async reserveStock(id: string, quantity: number): Promise<void> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article)
      throw new NotFoundException({
        error: 'ARTICLE_NOT_FOUND',
        message: `Article '${id}' not found`,
      });

    const available = article.stockQuantity - article.reservedQuantity;
    if (available < quantity) {
      throw new UnprocessableEntityException({
        error: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock for '${article.name}'`,
        field: 'quantity',
        details: {
          articleId: id,
          articleName: article.name,
          required: quantity,
          available,
          stockQuantity: article.stockQuantity,
          reservedQuantity: article.reservedQuantity,
        },
      });
    }

    await this.repo.update(id, {
      reservedQuantity: article.reservedQuantity + quantity,
    });
  }

  /** Used by W2 — consume reserved stock */
  async consumeStock(id: string, quantity: number): Promise<void> {
    const article = await this.repo.findOne({ where: { id } });
    if (!article) return;

    // RG21 — stock_quantity cannot go negative
    const newStock = article.stockQuantity - quantity;
    if (newStock < 0) {
      throw new UnprocessableEntityException({
        error: 'STOCK_CANNOT_BE_NEGATIVE',
        message: `Consuming ${quantity} units of '${article.name}' would make stock negative`,
      });
    }

    await this.repo.update(id, {
      stockQuantity: newStock,
      reservedQuantity: Math.max(0, article.reservedQuantity - quantity),
      consumedQuantity: article.consumedQuantity + quantity,
    });
  }

  /** Used by W6 (Sprint 3) — add incoming stock from reception */
  async addStock(id: string, quantity: number): Promise<void> {
    await this.repo.increment({ id }, 'stockQuantity', quantity);
  }

  private withComputed(
    article: Article,
  ): Article & { availableQuantity: number } {
    return {
      ...article,
      availableQuantity: article.stockQuantity - article.reservedQuantity,
    };
  }

  private generateBarcodeId(tenantId: string): string {
    const prefix = tenantId
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, '0');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WAPE-${prefix}-${date}-${rand}`;
  }
}
