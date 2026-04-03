import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Authentication required',
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Role '${user.role}' cannot perform this action`,
        details: { yourRole: user.role, requiredRoles },
      });
    }

    return true;
  }
}
