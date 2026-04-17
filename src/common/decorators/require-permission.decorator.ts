import { SetMetadata } from '@nestjs/common';
import { Operation, Resource } from '../permissions/permissions';

export const PERMISSION_KEY = 'permission';

export interface PermissionMeta {
  resource: Resource;
  operation: Operation;
}

export const RequirePermission = (resource: Resource, operation: Operation) =>
  SetMetadata(PERMISSION_KEY, { resource, operation });
