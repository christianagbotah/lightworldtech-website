export function normalizeSupplierInvoiceReference(value: string): string | null {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return normalized || null;
}
