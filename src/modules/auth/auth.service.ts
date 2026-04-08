import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto, RegisterDto, AuthTokensDto } from './dto/auth.dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import { UserRole } from '../../common/enums';
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const tenant = await this.tenantsService.create({
      name: dto.companyName,
      slug: dto.slug,
    });

    const user = await this.usersService.create({
      tenantId: tenant.id,
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      role: UserRole.ADMIN,
    });

    this.logger.log(`New tenant: ${tenant.slug} | admin: ${user.email}`);
    void this.mailService.sendWelcome(user.email, {
      fullName: user.fullName,
      companyName: tenant.name,
      email: user.email,
      slug: tenant.slug,
    });
    return this.generateTokens(user.id, tenant.id, user.role, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const tenant = await this.tenantsService.findBySlug(dto.slug);
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid company slug, email or password',
      });
    }

    const user = await this.usersService.findByEmailAndTenant(
      dto.email,
      tenant.id,
    );
    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid company slug, email or password',
      });
    }

    const isValid = await user.validatePassword(dto.password);
    if (!isValid) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid company slug, email or password',
      });
    }

    void this.usersService.updateLastLogin(user.id);
    return this.generateTokens(user.id, tenant.id, user.role, user.email);
  }

  async refresh(
    userId: string,
    tenantId: string,
    role: UserRole,
    email: string,
  ): Promise<AuthTokensDto> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new ForbiddenException({
        error: 'REFRESH_DENIED',
        message: 'User no longer active',
      });
    }
    return this.generateTokens(userId, tenantId, role, email);
  }

  private generateTokens(
    userId: string,
    tenantId: string,
    role: UserRole,
    email: string,
  ): AuthTokensDto {
    const payload: JwtPayload = { sub: userId, tenantId, role, email };

    const accessToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: (this.configService.get<string>('jwt.accessExpiresIn') ??
        '15m') as never,
    });

    const refreshToken = this.jwtService.sign(payload as object, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') ??
        '7d') as never,
    });

    return { accessToken, refreshToken, role, userId, tenantId };
  }
}
