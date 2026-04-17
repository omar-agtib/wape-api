import { UserRole } from '../enums';

// ── Operation types ────────────────────────────────────────────────────────
export type Operation = 'C' | 'R' | 'U' | 'D';
export type Resource = keyof typeof PERMISSIONS;

// ── Permission matrix — matches CDC exactly ────────────────────────────────
export const PERMISSIONS = {
  projects: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  tasks: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'CRUD',
    accountant: 'R',
    viewer: 'R',
  },
  personnel: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  tools: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: 'CRUD',
    accountant: '-',
    viewer: 'R',
  },
  articles_stock: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: 'CRUD',
    accountant: 'R',
    viewer: 'R',
  },
  purchase_orders: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'R',
    accountant: 'CRUD',
    viewer: 'R',
  },
  receptions: {
    admin: 'CRUD',
    project_manager: 'CR',
    site_manager: 'CRUD',
    accountant: 'R',
    viewer: 'R',
  },
  attachments: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  invoices: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: '-',
    accountant: 'CRUD',
    viewer: 'R',
  },
  finance: {
    admin: 'R',
    project_manager: 'R',
    site_manager: '-',
    accountant: 'R',
    viewer: 'R',
  },
  non_conformities: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'CRUD',
    accountant: '-',
    viewer: 'R',
  },
  documents: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: 'CR',
    accountant: 'R',
    viewer: 'R',
  },
  formation_support: {
    admin: 'CRUD',
    project_manager: 'R',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  contacts: {
    admin: 'CRUD',
    project_manager: 'CRU',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  gantt: {
    admin: 'R',
    project_manager: 'R',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  // New v4.0 modules
  operateurs: {
    admin: 'CRUD',
    project_manager: 'R',
    site_manager: 'CRUD',
    accountant: 'R',
    viewer: 'R',
  },
  pointages: {
    admin: 'CRUD',
    project_manager: 'R',
    site_manager: 'CRUD',
    accountant: 'R',
    viewer: 'R',
  },
  plans: {
    admin: 'CRUD',
    project_manager: 'CRUD',
    site_manager: 'CRU',
    accountant: 'R',
    viewer: 'R',
  },
  reporting: {
    admin: 'R',
    project_manager: 'R',
    site_manager: 'R',
    accountant: 'R',
    viewer: 'R',
  },
  // Admin-only
  users: {
    admin: 'CRUD',
    project_manager: '-',
    site_manager: '-',
    accountant: '-',
    viewer: '-',
  },
  subscriptions: {
    admin: 'CRUD',
    project_manager: '-',
    site_manager: '-',
    accountant: '-',
    viewer: '-',
  },
} as const;

// ── Role → permission string lookup ───────────────────────────────────────
const ROLE_MAP: Record<UserRole, keyof (typeof PERMISSIONS)[Resource]> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.PROJECT_MANAGER]: 'project_manager',
  [UserRole.SITE_MANAGER]: 'site_manager',
  [UserRole.ACCOUNTANT]: 'accountant',
  [UserRole.VIEWER]: 'viewer',
};

// ── Core check function ───────────────────────────────────────────────────

export function canDo(
  role: UserRole,
  resource: Resource,
  operation: Operation,
): boolean {
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) return false;

  const roleKey = ROLE_MAP[role];
  if (!roleKey) return false;

  const perms: string = resourcePerms[roleKey] ?? '-';
  if (perms === '-') return false;

  return perms.includes(operation);
}

// ── Get all roles allowed to do an operation on a resource ────────────────

export function rolesFor(resource: Resource, operation: Operation): UserRole[] {
  const resourcePerms = PERMISSIONS[resource];
  return (Object.keys(ROLE_MAP) as UserRole[]).filter((role) => {
    const roleKey = ROLE_MAP[role];
    const perms: string = resourcePerms[roleKey] ?? '-';
    return perms !== '-' && perms.includes(operation);
  });
}
