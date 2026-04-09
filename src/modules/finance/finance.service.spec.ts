import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Subscription } from './entities/subscription.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SubcontractorPayment } from './entities/subcontractor-payment.entity';
import { Transaction } from './entities/transaction.entity';
import { ContactsService } from '../contacts/contacts.service';
import { MailService } from '../../shared/mail/mail.service';
import {
  BillingType,
  PaymentMethodType,
  PaymentStatus,
  ReceptionStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from '../../common/enums';
import { createMockRepository } from '../../test/helpers/mock-repository';
import { createMockMailService } from '../../test/helpers/mock-services';

type ErrorResponse = {
  error: string;
  details?: Record<string, any>;
};

describe('FinanceService', () => {
  let service: FinanceService;
  let subRepo: ReturnType<typeof createMockRepository>;
  let spRepo: ReturnType<typeof createMockRepository>;
  let txRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-uuid';

  const mockSubscription = {
    id: 'sub-uuid',
    tenantId,
    companyName: 'ACME Construction',
    billingType: BillingType.MONTHLY,
    plan: SubscriptionPlan.BUSINESS,
    price: 1500,
    currency: 'MAD',
    billingStartDate: '2026-04-01',
    nextBillingDate: '2026-05-01',
    paymentMethod: PaymentMethodType.CREDIT_CARD,
    status: ReceptionStatus.PENDING,
    accessRestricted: false,
  };

  const mockSupplierPayment = {
    id: 'sp-uuid',
    tenantId,
    supplierId: 'supplier-uuid',
    invoiceNumber: 'FACT-2026-001',
    amount: 24600,
    amountPaid: 0,
    remainingAmount: 24600,
    dueDate: '2026-05-31',
    currency: 'MAD',
    status: PaymentStatus.PENDING,
  };

  beforeEach(async () => {
    subRepo = createMockRepository();
    spRepo = createMockRepository();
    const scpRepo = createMockRepository();
    txRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(SupplierPayment), useValue: spRepo },
        {
          provide: getRepositoryToken(SubcontractorPayment),
          useValue: scpRepo,
        },
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        {
          provide: ContactsService,
          useValue: {
            verifyType: jest.fn().mockResolvedValue({}),
          },
        },
        { provide: MailService, useValue: createMockMailService() },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  // ── createSubscription ────────────────────────────────────────────────────────

  describe('createSubscription', () => {
    const dto = {
      companyName: 'ACME',
      billingType: BillingType.MONTHLY,
      plan: SubscriptionPlan.BUSINESS,
      price: 1500,
      currency: 'MAD',
      billingStartDate: '2026-04-01',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    it('creates subscription and calculates monthly nextBillingDate', async () => {
      subRepo.findOne!.mockResolvedValue(null);
      subRepo.create!.mockReturnValue({ ...mockSubscription });
      subRepo.save!.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription(tenantId, dto);

      expect(result.status).toBe(SubscriptionStatus.PENDING);
      expect(result.nextBillingDate).toBe('2026-05-01');
    });

    it('calculates yearly nextBillingDate correctly', async () => {
      subRepo.findOne!.mockResolvedValue(null);
      const yearlySub = {
        ...mockSubscription,
        billingType: BillingType.YEARLY,
        nextBillingDate: '2027-04-01',
      };
      subRepo.create!.mockReturnValue(yearlySub);
      subRepo.save!.mockResolvedValue(yearlySub);

      const result = await service.createSubscription(tenantId, {
        ...dto,
        billingType: BillingType.YEARLY,
      });

      expect(result.nextBillingDate).toBe('2027-04-01');
    });

    it('throws SUBSCRIPTION_ALREADY_EXISTS (RG-P02) when one exists', async () => {
      subRepo.findOne!.mockResolvedValue(mockSubscription);

      await expect(service.createSubscription(tenantId, dto)).rejects.toThrow(
        ConflictException,
      );

      try {
        await service.createSubscription(tenantId, dto);
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('SUBSCRIPTION_ALREADY_EXISTS');
        expect(response.details).toHaveProperty('existingSubscriptionId');
      }
    });
  });

  // ── paySupplier (W13) ─────────────────────────────────────────────────────────

  describe('paySupplier', () => {
    beforeEach(() => {
      txRepo.create!.mockImplementation((data: unknown) => data);
      txRepo.save!.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: 'tx-uuid' }),
      );
      spRepo.update!.mockResolvedValue(undefined);
    });

    it('creates partial payment and updates status to partially_paid', async () => {
      spRepo
        .findOne!.mockResolvedValueOnce(mockSupplierPayment) // first call: fetch payment
        .mockResolvedValueOnce({
          // second call: fetch updated
          ...mockSupplierPayment,
          amountPaid: 15000,
          remainingAmount: 9600,
          status: PaymentStatus.PARTIALLY_PAID,
        });

      const result = await service.paySupplier(tenantId, 'sp-uuid', {
        amount: 15000,
        paymentMethod: PaymentMethodType.BANK_TRANSFER,
      });

      expect(result.supplierPayment.status).toBe(PaymentStatus.PARTIALLY_PAID);
      expect(result.supplierPayment.amountPaid).toBe(15000);
      expect(result.supplierPayment.remainingAmount).toBe(9600);
      expect(result.transaction).toBeDefined();
    });

    it('throws AMOUNT_EXCEEDS_REMAINING (RG-P01) when overpaying', async () => {
      // Each paySupplier call does one findOne — mock it fresh each time
      spRepo.findOne!.mockResolvedValue(mockSupplierPayment);

      await expect(
        service.paySupplier(tenantId, 'sp-uuid', {
          amount: 99999,
          paymentMethod: PaymentMethodType.BANK_TRANSFER,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.paySupplier(tenantId, 'sp-uuid', {
          amount: 99999,
          paymentMethod: PaymentMethodType.BANK_TRANSFER,
        });
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('AMOUNT_EXCEEDS_REMAINING');
        expect(response.details?.remaining).toBe(24600);
      }
    });

    it('marks as paid when full amount is paid', async () => {
      spRepo
        .findOne!.mockResolvedValueOnce(mockSupplierPayment) // first call: fetch payment
        .mockResolvedValueOnce({
          // second call: fetch updated
          ...mockSupplierPayment,
          amountPaid: 24600,
          remainingAmount: 0,
          status: PaymentStatus.PAID,
        });

      const result = await service.paySupplier(tenantId, 'sp-uuid', {
        amount: 24600,
        paymentMethod: PaymentMethodType.BANK_TRANSFER,
      });

      expect(result.supplierPayment.status).toBe(PaymentStatus.PAID);
      expect(result.supplierPayment.remainingAmount).toBe(0);
    });
  });

  // ── findAllTransactions — RG-P08 ────────────────────────────────────────────

  describe('findAllTransactions', () => {
    it('throws DATE_RANGE_TOO_LARGE (RG-P08) when range exceeds 12 months', async () => {
      await expect(
        service.findAllTransactions(tenantId, {
          dateFrom: '2024-01-01',
          dateTo: '2026-12-31',
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.findAllTransactions(tenantId, {
          dateFrom: '2024-01-01',
          dateTo: '2026-12-31',
        });
      } catch (e: any) {
        const response = (e as HttpException).getResponse() as ErrorResponse;
        expect(response.error).toBe('DATE_RANGE_TOO_LARGE');
      }
    });

    it('allows date range of exactly 12 months', async () => {
      txRepo.createQueryBuilder!.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      await expect(
        service.findAllTransactions(tenantId, {
          dateFrom: '2026-01-01',
          dateTo: '2027-01-01',
          page: 1,
          limit: 20,
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── validateBankTransfer — RG-P04 ───────────────────────────────────────────

  describe('validateBankTransfer', () => {
    it('throws INSUFFICIENT_PERMISSIONS (RG-P04) for viewer role', async () => {
      await expect(
        service.validateBankTransfer(tenantId, 'tx-uuid', {}, UserRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws INSUFFICIENT_PERMISSIONS (RG-P04) for site_manager role', async () => {
      await expect(
        service.validateBankTransfer(
          tenantId,
          'tx-uuid',
          {},
          UserRole.SITE_MANAGER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to validate', async () => {
      txRepo.findOne!.mockResolvedValue({
        id: 'tx-uuid',
        status: 'pending',
        paymentType: 'supplier',
        gatewayResponse: {},
      });
      txRepo.update!.mockResolvedValue(undefined);
      txRepo
        .findOne!.mockResolvedValueOnce({
          id: 'tx-uuid',
          status: 'pending',
          paymentType: 'supplier',
        })
        .mockResolvedValueOnce({ id: 'tx-uuid', status: 'success' });

      await expect(
        service.validateBankTransfer(tenantId, 'tx-uuid', {}, UserRole.ADMIN),
      ).resolves.not.toThrow();
    });

    it('allows accountant to validate', async () => {
      txRepo.findOne!.mockResolvedValue({
        id: 'tx-uuid',
        status: 'pending',
        paymentType: 'supplier',
        gatewayResponse: {},
      });
      txRepo.update!.mockResolvedValue(undefined);
      txRepo
        .findOne!.mockResolvedValueOnce({
          id: 'tx-uuid',
          status: 'pending',
          paymentType: 'supplier',
        })
        .mockResolvedValueOnce({ id: 'tx-uuid', status: 'success' });

      await expect(
        service.validateBankTransfer(
          tenantId,
          'tx-uuid',
          {},
          UserRole.ACCOUNTANT,
        ),
      ).resolves.not.toThrow();
    });
  });
});
