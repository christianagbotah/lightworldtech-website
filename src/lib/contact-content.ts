export function normalizeWhatsappNumber(value: unknown, defaultCountryCode = '233'): string {
  if (typeof value !== 'string') return '';

  const raw = value.trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  const countryCode = defaultCountryCode.replace(/\D/g, '');
  if (!countryCode) return digits;

  if (digits.startsWith(countryCode + '0')) {
    return countryCode + digits.slice(countryCode.length + 1);
  }

  if (digits.startsWith(countryCode)) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return countryCode + digits.slice(1);
  }

  return digits;
}
