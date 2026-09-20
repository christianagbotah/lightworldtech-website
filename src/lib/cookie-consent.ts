export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export const defaultCookiePreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export const acceptedCurrentCookiePreferences: CookiePreferences = {
  essential: true,
  analytics: true,
  marketing: false,
  preferences: false,
};

export function normalizeCookiePreferences(value: unknown): CookiePreferences {
  if (!value || typeof value !== 'object') return { ...defaultCookiePreferences };

  const record = value as Record<string, unknown>;
  return {
    essential: true,
    analytics: record.analytics === true,
    marketing: false,
    preferences: record.preferences === true,
  };
}

export function parseCookiePreferences(raw: string | null | undefined): CookiePreferences {
  if (!raw) return { ...defaultCookiePreferences };

  try {
    return normalizeCookiePreferences(JSON.parse(raw));
  } catch {
    return { ...defaultCookiePreferences };
  }
}
