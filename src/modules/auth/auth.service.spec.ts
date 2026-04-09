import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { MailService } from '../../shared/mail/mail.service';
import { UserRole } from '../../common/enums';
import { createMockMailService } from '../../test/helpers/mock-services';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tenantsService: jest.Mocked<TenantsService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-uuid',
    name: 'ACME Construction',
    slug: 'acme',
    slugPrefix: 'ACME',
    isActive: true,
  };

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    tenantId: 'tenant-uuid',
    email: 'admin@acme.ma',
    fullName: 'Admin ACME',
    role: UserRole.ADMIN,
    isActive: true,
    passwordHash: '$2b$12$hashed',
    validatePassword: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmailAndTenant: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: TenantsService,
          useValue: {
            create: jest.fn(),
            findBySlug: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-secret'),
          },
        },
        {
          provide: MailService,
          useValue: createMockMailService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    tenantsService = module.get(TenantsService);
    jwtService = module.get(JwtService);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates tenant + admin user and returns tokens', async () => {
      tenantsService.create.mockResolvedValue(mockTenant as Tenant);
      usersService.create.mockResolvedValue(mockUser as User);

      const result = await service.register({
        companyName: 'ACME Construction',
        slug: 'acme',
        fullName: 'Admin ACME',
        email: 'admin@acme.ma',
        password: 'Wape@2026!',
      });

      expect(tenantsService.create).toHaveBeenCalledWith({
        name: 'ACME Construction',
        slug: 'acme',
      });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ADMIN,
          email: 'admin@acme.ma',
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.tenantId).toBe('tenant-uuid');
    });

    it('throws ConflictException when slug already exists', async () => {
      tenantsService.create.mockRejectedValue(
        new ConflictException({ error: 'SLUG_ALREADY_EXISTS' }),
      );

      await expect(
        service.register({
          companyName: 'Dup',
          slug: 'acme',
          fullName: 'User',
          email: 'u@acme.ma',
          password: 'Wape@2026!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      tenantsService.findBySlug.mockResolvedValue(mockTenant as Tenant);
      usersService.findByEmailAndTenant.mockResolvedValue(mockUser as User);
      (mockUser.validatePassword as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        slug: 'acme',
        email: 'admin@acme.ma',
        password: 'Wape@2026!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.userId).toBe('user-uuid');
    });

    it('throws UnauthorizedException for unknown slug', async () => {
      tenantsService.findBySlug.mockResolvedValue(null);

      await expect(
        service.login({ slug: 'unknown', email: 'x@x.ma', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      tenantsService.findBySlug.mockResolvedValue(mockTenant as Tenant);
      usersService.findByEmailAndTenant.mockResolvedValue({
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false),
      } as User);

      await expect(
        service.login({
          slug: 'acme',
          email: 'admin@acme.ma',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      tenantsService.findBySlug.mockResolvedValue(mockTenant as Tenant);
      usersService.findByEmailAndTenant.mockResolvedValue(null);

      await expect(
        service.login({
          slug: 'acme',
          email: 'ghost@acme.ma',
          password: 'pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive tenant', async () => {
      tenantsService.findBySlug.mockResolvedValue({
        ...mockTenant,
        isActive: false,
      } as Tenant);

      await expect(
        service.login({
          slug: 'acme',
          email: 'admin@acme.ma',
          password: 'pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
