export function normalizePhone(value: string, defaultCountry = 'GH'): string {
  let digits = value.trim().replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');

  if (defaultCountry === 'GH') {
    if (/^0\d{9}$/.test(digits)) digits = '233' + digits.slice(1);
    else if (/^\d{9}$/.test(digits)) digits = '233' + digits;
  }

  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error('Phone number must be a valid international number');
  }
  return digits;
}

export function renderSmsTemplate(
  body: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return body.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  }).replace(/\s+/g, ' ').trim();
}

export function smsSegmentEstimate(content: string): number {
  if (!content) return 0;
  return Math.max(1, Math.ceil(content.length / (content.length <= 160 ? 160 : 153)));
}
