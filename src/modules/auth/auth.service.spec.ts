import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-uuid',
    name: 'ACME Construction',
    slug: 'acme',
    slugPrefix: 'ACME',
    isActive: true,
  };

  const mockUserBase: Partial<User> = {
    id: 'user-uuid',
    tenantId: 'tenant-uuid',
    email: 'admin@acme.ma',
    fullName: 'Admin ACME',
    role: UserRole.ADMIN,
    isActive: true,
    passwordHash: '$2b$12$hashed',
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
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    tenantsService = module.get(TenantsService);

    jest.clearAllMocks();
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates tenant + admin user and returns tokens', async () => {
      tenantsService.create.mockResolvedValue(mockTenant as Tenant);
      usersService.create.mockResolvedValue(mockUserBase as User);

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

      const mockValidatePassword = jest.fn().mockResolvedValue(true);
      const mockUser = {
        ...mockUserBase,
        validatePassword: mockValidatePassword,
      } as User;

      usersService.findByEmailAndTenant.mockResolvedValue(mockUser);

      const result = await service.login({
        slug: 'acme',
        email: 'admin@acme.ma',
        password: 'Wape@2026!',
      });

      expect(tenantsService.findBySlug).toHaveBeenCalledWith('acme');
      expect(usersService.findByEmailAndTenant).toHaveBeenCalledWith(
        'admin@acme.ma',
        'tenant-uuid',
      );
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.userId).toBe('user-uuid');
      expect(mockValidatePassword).toHaveBeenCalledWith('Wape@2026!');
    });

    it('throws UnauthorizedException for unknown slug', async () => {
      tenantsService.findBySlug.mockResolvedValue(null);

      await expect(
        service.login({ slug: 'unknown', email: 'x@x.ma', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      tenantsService.findBySlug.mockResolvedValue(mockTenant as Tenant);

      const mockValidatePassword = jest.fn().mockResolvedValue(false);
      const mockUser = {
        ...mockUserBase,
        validatePassword: mockValidatePassword,
      } as User;

      usersService.findByEmailAndTenant.mockResolvedValue(mockUser);

      await expect(
        service.login({
          slug: 'acme',
          email: 'admin@acme.ma',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockValidatePassword).toHaveBeenCalledWith('wrong');
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
