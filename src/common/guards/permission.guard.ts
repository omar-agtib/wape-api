import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  PERMISSION_KEY,
  PermissionMeta,
} from '../decorators/require-permission.decorator';
import { canDo } from '../permissions/permissions';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<PermissionMeta>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission → allow (other guards like @Roles handle it)
    if (!meta) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException({
        error: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    if (!canDo(user.role, meta.resource, meta.operation)) {
      throw new ForbiddenException({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Role '${user.role}' cannot perform '${meta.operation}' on '${meta.resource}'`,
        details: {
          role: user.role,
          resource: meta.resource,
          operation: meta.operation,
        },
      });
    }

    return true;
  }
}
