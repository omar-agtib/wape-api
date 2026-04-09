import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './article.entity';
import { createMockRepository } from '../../test/helpers/mock-repository';
import { createMockCloudinaryService } from '../../test/helpers/mock-services';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';

jest.mock('bwip-js', () => ({
  toBuffer: (_opts: any, cb: (err: null, buf: Buffer) => void) =>
    cb(null, Buffer.from('fake-png')),
}));

type ErrorResponse = {
  error: string;
  details?: Record<string, any>;
};

describe('ArticlesService', () => {
  let service: ArticlesService;
  let articleRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';
  const mockArticle = {
    id: 'article-uuid',
    tenantId,
    name: 'Ciment Portland CPJ 45',
    category: 'Matériaux',
    unitPrice: 85,
    currency: 'MAD',
    barcodeId: 'WAPE-ACME-20260401-A3F9X2',
    stockQuantity: 500,
    reservedQuantity: 100,
    consumedQuantity: 50,
    barcodeImageUrl: null,
  };

  beforeEach(async () => {
    articleRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        { provide: CloudinaryService, useValue: createMockCloudinaryService() },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  // ── availableQuantity ────────────────────────────────────────────────────────

  describe('availableQuantity computation', () => {
    it('computes availableQuantity = stock - reserved', async () => {
      articleRepo.findOne!.mockResolvedValue(mockArticle);

      const result = await service.findOne(tenantId, 'article-uuid');

      expect(result.availableQuantity).toBe(400); // 500 - 100
    });

    it('returns 0 availableQuantity when fully reserved', async () => {
      articleRepo.findOne!.mockResolvedValue({
        ...mockArticle,
        stockQuantity: 100,
        reservedQuantity: 100,
      });

      const result = await service.findOne(tenantId, 'article-uuid');
      expect(result.availableQuantity).toBe(0);
    });
  });

  // ── barcodeId generation ─────────────────────────────────────────────────────

  describe('barcodeId generation', () => {
    it('generates barcodeId in WAPE-XXXX-YYYYMMDD-XXXXXX format', async () => {
      // Use passthrough mock so the generated barcodeId is preserved
      articleRepo.create!.mockImplementation((data: unknown) => data);
      articleRepo.save!.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: 'article-uuid' }),
      );

      const result = await service.create(tenantId, {
        name: 'Test Article',
        category: 'Test',
        unitPrice: 10,
        currency: 'MAD',
      });

      expect(result.barcodeId).toMatch(/^WAPE-[A-Z0-9]{4}-\d{8}-[A-Z0-9]{6}$/);
    });

    it('generates unique barcodeIds for different articles', async () => {
      articleRepo.create!.mockImplementation((data: unknown) => data);
      articleRepo.save!.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: `art-${Math.random()}` }),
      );

      const dto = {
        name: 'Art',
        category: 'Cat',
        unitPrice: 10,
        currency: 'MAD',
      };
      const r1 = await service.create(tenantId, dto);
      const r2 = await service.create(tenantId, dto);

      expect(r1.barcodeId).not.toBe(r2.barcodeId);
      expect(r1.barcodeId).toMatch(/^WAPE-[A-Z0-9]{4}-\d{8}-[A-Z0-9]{6}$/);
      expect(r2.barcodeId).toMatch(/^WAPE-[A-Z0-9]{4}-\d{8}-[A-Z0-9]{6}$/);
    });
  });

  // ── reserveStock ─────────────────────────────────────────────────────────────

  describe('reserveStock', () => {
    it('increments reservedQuantity successfully', async () => {
      articleRepo.findOne!.mockResolvedValue(mockArticle); // 500 stock, 100 reserved
      articleRepo.update!.mockResolvedValue(undefined);

      await expect(
        service.reserveStock('article-uuid', 100), // 400 available
      ).resolves.not.toThrow();

      expect(articleRepo.update).toHaveBeenCalledWith('article-uuid', {
        reservedQuantity: 200, // 100 + 100
      });
    });

    it('throws INSUFFICIENT_STOCK (RG02) when available < requested', async () => {
      articleRepo.findOne!.mockResolvedValue(mockArticle); // 400 available

      await expect(
        service.reserveStock('article-uuid', 500), // 500 > 400 available
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.reserveStock('article-uuid', 500);
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('INSUFFICIENT_STOCK');
        expect(response.details).toHaveProperty('available', 400);
        expect(response.details).toHaveProperty('required', 500);
      }
    });
  });

  // ── consumeStock ─────────────────────────────────────────────────────────────

  describe('consumeStock', () => {
    it('decrements stock and reserved, increments consumed', async () => {
      articleRepo.findOne!.mockResolvedValue(mockArticle);
      articleRepo.update!.mockResolvedValue(undefined);

      await service.consumeStock('article-uuid', 50);

      expect(articleRepo.update).toHaveBeenCalledWith('article-uuid', {
        stockQuantity: 450, // 500 - 50
        reservedQuantity: 50, // 100 - 50
        consumedQuantity: 100, // 50 + 50
      });
    });

    it('throws STOCK_CANNOT_BE_NEGATIVE (RG21) when consumption exceeds stock', async () => {
      articleRepo.findOne!.mockResolvedValue({
        ...mockArticle,
        stockQuantity: 30,
      });

      await expect(service.consumeStock('article-uuid', 50)).rejects.toThrow(
        UnprocessableEntityException,
      );

      try {
        await service.consumeStock('article-uuid', 50);
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('STOCK_CANNOT_BE_NEGATIVE');
      }
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws ARTICLE_NOT_FOUND for unknown id', async () => {
      articleRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
