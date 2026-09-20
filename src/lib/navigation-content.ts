export type ManagedNavigationLink = {
  label: string;
  href: string;
};

export type ManagedNavigationMenuItem = {
  title: string;
  desc: string;
  href: string;
  icon: string;
};

const allowedSchemes = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function safeNavigationHref(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return allowedSchemes.has(url.protocol) ? trimmed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeNavigationLinks(
  value: unknown,
  fallback: ManagedNavigationLink[],
): ManagedNavigationLink[] {
  if (!Array.isArray(value)) return fallback;

  const items = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!label) return [];

    return [{
      label: label.slice(0, 80),
      href: safeNavigationHref(record.href, '/'),
    }];
  });

  return items.length ? items : fallback;
}

export function normalizeNavigationMenu(
  value: unknown,
  fallback: ManagedNavigationMenuItem[],
): ManagedNavigationMenuItem[] {
  if (!Array.isArray(value)) return fallback;

  const items = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) return [];

    const desc = typeof record.desc === 'string' ? record.desc.trim() : '';
    const icon = typeof record.icon === 'string' ? record.icon.trim().toLowerCase() : '';

    return [{
      title: title.slice(0, 100),
      desc: desc.slice(0, 180),
      href: safeNavigationHref(record.href, '/'),
      icon: icon.slice(0, 40),
    }];
  });

  return items.length ? items : fallback;
}
