import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from './contact.entity';
import { ContactDocument } from './contact-document.entity';
import { ContactType } from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';

type ErrorResponse = {
  error: string;
  details?: {
    actualType: ContactType;
    expectedType: ContactType;
    [key: string]: any;
  };
};

describe('ContactsService', () => {
  let service: ContactsService;
  let contactRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';
  const mockSupplier = {
    id: 'supplier-uuid',
    tenantId,
    contactType: ContactType.SUPPLIER,
    legalName: 'SONASID S.A.',
    email: 'achats@sonasid.ma',
  };

  const mockClient = {
    id: 'client-uuid',
    tenantId,
    contactType: ContactType.CLIENT,
    legalName: 'Atlas Immobilier',
  };

  beforeEach(async () => {
    contactRepo = createMockRepository();
    const docRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
        { provide: getRepositoryToken(ContactDocument), useValue: docRepo },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  // ── verifyType ───────────────────────────────────────────────────────────────

  describe('verifyType', () => {
    it('passes when contact type matches expected', async () => {
      contactRepo.findOne!.mockResolvedValue(mockSupplier);

      await expect(
        service.verifyType(tenantId, 'supplier-uuid', ContactType.SUPPLIER),
      ).resolves.toEqual(mockSupplier);
    });

    it('throws INVALID_SUPPLIER_TYPE (RG08) when contact is not a supplier', async () => {
      contactRepo.findOne!.mockResolvedValue(mockClient);

      await expect(
        service.verifyType(tenantId, 'client-uuid', ContactType.SUPPLIER),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.verifyType(tenantId, 'client-uuid', ContactType.SUPPLIER);
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('INVALID_SUPPLIER_TYPE');
        expect(response.details?.actualType).toBe(ContactType.CLIENT);
        expect(response.details?.expectedType).toBe(ContactType.SUPPLIER);
      }
    });

    it('throws INVALID_CLIENT_TYPE (RG06) when contact is not a client', async () => {
      contactRepo.findOne!.mockResolvedValue(mockSupplier);

      try {
        await service.verifyType(tenantId, 'supplier-uuid', ContactType.CLIENT);
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('INVALID_CLIENT_TYPE');
      }
    });

    it('throws INVALID_SUBCONTRACTOR_TYPE when contact is not a subcontractor', async () => {
      contactRepo.findOne!.mockResolvedValue(mockSupplier);

      try {
        await service.verifyType(
          tenantId,
          'supplier-uuid',
          ContactType.SUBCONTRACTOR,
        );
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('INVALID_SUBCONTRACTOR_TYPE');
      }
    });

    it('throws NOT_FOUND for unknown contact', async () => {
      contactRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.verifyType(tenantId, 'unknown', ContactType.SUPPLIER),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
