export const ADMIN_PERMISSION_DEFINITIONS = [
  {
    key: 'site.manage',
    label: 'Website & CMS',
    description: 'Manage page content, settings, services, blog, team, testimonials, portfolio, FAQs and CMS uploads.',
  },
  {
    key: 'crm.manage',
    label: 'CRM & Messages',
    description: 'View and manage website enquiries, CRM leads, assignments, follow-ups and internal lead notes.',
  },
  {
    key: 'proposals.manage',
    label: 'Proposals',
    description: 'Create, edit, review and manage commercial proposals linked to CRM leads.',
  },
  {
    key: 'clients.manage',
    label: 'Client Portal',
    description: 'Manage client organizations, users, projects, milestones, documents, announcements and support.',
  },
  {
    key: 'communications.manage',
    label: 'Newsletter & Campaigns',
    description: 'Manage newsletter subscribers, delivery diagnostics and outbound campaign content.',
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_DEFINITIONS)[number]['key'];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] =
  ADMIN_PERMISSION_DEFINITIONS.map((item) => item.key);

const permissionSet = new Set<string>(ALL_ADMIN_PERMISSIONS);

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  let candidate = value;

  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value);
    } catch {
      candidate = [];
    }
  }

  if (!Array.isArray(candidate)) return [];

  return Array.from(
    new Set(
      candidate.filter(
        (item): item is AdminPermission =>
          typeof item === 'string' && permissionSet.has(item),
      ),
    ),
  );
}

export function hasAdminPermission(
  role: string,
  permissions: unknown,
  permission: AdminPermission,
): boolean {
  if (role === 'super_admin') return true;
  return normalizeAdminPermissions(permissions).includes(permission);
}

export function requiredAdminPermissionForPath(
  pathname: string,
): AdminPermission | null {
  if (
    pathname.startsWith('/api/admin/proposals/') &&
    pathname.endsWith('/convert-client')
  ) {
    return 'clients.manage';
  }

  if (pathname.startsWith('/api/admin/proposals')) {
    return 'proposals.manage';
  }

  if (
    pathname.startsWith('/api/admin/leads') ||
    pathname === '/api/contact' ||
    pathname.startsWith('/api/contact/')
  ) {
    return 'crm.manage';
  }

  if (
    pathname.startsWith('/api/admin/clients') ||
    pathname.startsWith('/api/admin/client-')
  ) {
    return 'clients.manage';
  }

  if (pathname.startsWith('/api/admin/newsletter')) {
    return 'communications.manage';
  }

  if (pathname.startsWith('/api/admin/analytics')) {
    return 'site.manage';
  }

  if (
    pathname.startsWith('/api/admin/services') ||
    pathname.startsWith('/api/admin/team') ||
    pathname.startsWith('/api/admin/testimonials') ||
    pathname.startsWith('/api/admin/portfolio') ||
    pathname.startsWith('/api/admin/faqs') ||
    pathname === '/api/upload' ||
    pathname.startsWith('/api/services') ||
    pathname.startsWith('/api/team') ||
    pathname.startsWith('/api/testimonials') ||
    pathname.startsWith('/api/portfolio') ||
    pathname.startsWith('/api/faqs') ||
    pathname.startsWith('/api/blog') ||
    pathname.startsWith('/api/process-steps') ||
    pathname.startsWith('/api/settings')
  ) {
    return 'site.manage';
  }

  return null;
}
