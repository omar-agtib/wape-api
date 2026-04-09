import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.entity';
import { InvoiceStatus } from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';
import {
  createMockMailService,
  createMockRealtimeService,
} from '../../test/helpers/mock-services';
import { MailService } from '../../shared/mail/mail.service';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { ContactsService } from '../contacts/contacts.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';

  const mockInvoice = {
    id: 'invoice-uuid',
    tenantId,
    invoiceNumber: 'INV-2026-0001',
    attachmentId: 'attachment-uuid',
    subcontractorId: 'sc-uuid',
    projectId: 'project-uuid',
    amount: 89000,
    currency: 'MAD',
    status: InvoiceStatus.PENDING_VALIDATION,
    issuedAt: new Date(),
    validatedAt: null,
    paidAt: null,
  };

  beforeEach(async () => {
    invoiceRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: MailService, useValue: createMockMailService() },
        { provide: RealtimeService, useValue: createMockRealtimeService() },
        {
          provide: ContactsService,
          useValue: {
            findOneRaw: jest.fn().mockResolvedValue({
              id: 'sc-uuid',
              legalName: 'BTP Électrique',
              email: 'contact@btp-elec.ma',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  // ── createFromAttachment ──────────────────────────────────────────────────────

  describe('createFromAttachment', () => {
    it('creates invoice with INV-YYYY-NNNN format', async () => {
      invoiceRepo.createQueryBuilder!.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });
      invoiceRepo.create!.mockReturnValue(mockInvoice);
      invoiceRepo.save!.mockResolvedValue(mockInvoice);

      const result = await service.createFromAttachment({
        tenantId,
        attachmentId: 'attachment-uuid',
        subcontractorId: 'sc-uuid',
        projectId: 'project-uuid',
        amount: 89000,
        currency: 'MAD',
      });

      expect(result.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(result.status).toBe(InvoiceStatus.PENDING_VALIDATION);
      expect(result.amount).toBe(89000);
    });

    it('auto-increments sequence (INV-2026-0001, 0002, ...)', async () => {
      invoiceRepo.createQueryBuilder!.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      });
      invoiceRepo.create!.mockImplementation((data: any) => data);
      invoiceRepo.save!.mockImplementation((entity: any) =>
        Promise.resolve(entity),
      );

      const r1 = await service.createFromAttachment({
        tenantId,
        attachmentId: 'att-1',
        subcontractorId: 'sc-uuid',
        projectId: 'proj-uuid',
        amount: 1000,
        currency: 'MAD',
      });

      const r2 = await service.createFromAttachment({
        tenantId,
        attachmentId: 'att-2',
        subcontractorId: 'sc-uuid',
        projectId: 'proj-uuid',
        amount: 2000,
        currency: 'MAD',
      });

      const year = new Date().getFullYear();
      expect(r1.invoiceNumber).toBe(`INV-${year}-0001`);
      expect(r2.invoiceNumber).toBe(`INV-${year}-0002`);
    });
  });

  // ── validate (RG19) ────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('transitions pending_validation → validated', async () => {
      invoiceRepo.findOne!.mockResolvedValue(mockInvoice);
      invoiceRepo.update!.mockResolvedValue(undefined);
      invoiceRepo
        .findOne!.mockResolvedValueOnce(mockInvoice)
        .mockResolvedValueOnce({
          ...mockInvoice,
          status: InvoiceStatus.VALIDATED,
        });

      const result = await service.validate(tenantId, 'invoice-uuid');
      expect(result.status).toBe(InvoiceStatus.VALIDATED);
    });

    it('throws INVOICE_STATUS_REGRESSION (RG19) when trying to validate a paid invoice', async () => {
      invoiceRepo.findOne!.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      });

      await expect(service.validate(tenantId, 'invoice-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );

      try {
        await service.validate(tenantId, 'invoice-uuid');
      } catch (e: any) {
        expect(e.response.error).toBe('INVOICE_STATUS_REGRESSION');
        expect(e.response.details.current).toBe(InvoiceStatus.PAID);
        expect(e.response.details.requested).toBe(InvoiceStatus.VALIDATED);
      }
    });

    it('throws RG19 when trying to skip to paid from pending_validation', async () => {
      invoiceRepo.findOne!.mockResolvedValue(mockInvoice); // pending_validation

      await expect(service.markPaid(tenantId, 'invoice-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ── markPaid ──────────────────────────────────────────────────────────────────

  describe('markPaid', () => {
    it('transitions validated → paid', async () => {
      const validatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.VALIDATED,
      };
      invoiceRepo
        .findOne!.mockResolvedValueOnce(validatedInvoice)
        .mockResolvedValueOnce({
          ...validatedInvoice,
          status: InvoiceStatus.PAID,
        });
      invoiceRepo.update!.mockResolvedValue(undefined);

      const result = await service.markPaid(tenantId, 'invoice-uuid');
      expect(result.status).toBe(InvoiceStatus.PAID);
    });

    it('throws RG19 when trying to mark paid invoice as paid again', async () => {
      invoiceRepo.findOne!.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      });

      await expect(service.markPaid(tenantId, 'invoice-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws INVOICE_NOT_FOUND for unknown id', async () => {
      invoiceRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
