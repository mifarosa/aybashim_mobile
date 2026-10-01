// Amounts are kept as JS numbers with two decimals; sums are accumulated in integer
// cents so that totals do not drift because of floating point errors.

export const toCents = (value) => Math.round(Number(value || 0) * 100);

export const fromCents = (cents) => cents / 100;

export function sumAmounts(items) {
  return fromCents(items.reduce((total, item) => total + toCents(item.amount), 0));
}

/**
 * Parses statement amounts written with comma thousands separators and a dot decimal
 * separator (e.g. "1,250.00", "-125.50", "+15,000.00"). Returns null when invalid.
 */
export function parseDotDecimal(text) {
  if (text == null) return null;
  const cleaned = String(text).trim().replace(/,/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const moneyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2
});

export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}
