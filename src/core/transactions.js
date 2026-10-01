// Validation and identity of parsed transactions.

export const TRANSACTION_TYPES = ['DEBIT', 'CREDIT'];

/**
 * Mirrors the backend normalizeAndValidate step. Returns a cleaned transaction,
 * or null when the row is not usable (missing date/description, bad amount or type).
 */
export function normalizeTransaction(raw) {
  if (!raw) return null;

  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  // Number(null) and Number('') are 0, so only real numbers are accepted.
  const amount = typeof raw.amount === 'number' ? raw.amount : NaN;
  const type = String(raw.type || '').trim().toUpperCase();

  if (!date || !description) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!TRANSACTION_TYPES.includes(type)) return null;

  return {
    date,
    description,
    amount: Math.round(amount * 100) / 100,
    type,
    bankName: raw.bankName ? String(raw.bankName).trim() : '',
    sourceFile: raw.sourceFile ? String(raw.sourceFile).trim() : ''
  };
}

/**
 * Identity used for duplicate detection. The backend used a unique constraint on
 * (date, description, amount, type, bankName); the same fields are used here.
 */
export function baseKey(tx) {
  return [tx.date, tx.description, tx.amount.toFixed(2), tx.type, tx.bankName].join('|');
}

const bankAgnosticKey = (tx) => [tx.date, tx.description, Number(tx.amount).toFixed(2), tx.type].join('|');

/**
 * Counts incoming transactions that already exist under a different bank name.
 * Several statement formats look alike, so picking the wrong bank imports the same
 * rows again with another bank name; a high count is a strong hint of that mistake.
 */
export function countOtherBankMatches(incoming, existing) {
  const banksByKey = new Map();
  for (const tx of existing) {
    const key = bankAgnosticKey(tx);
    if (!banksByKey.has(key)) banksByKey.set(key, new Set());
    banksByKey.get(key).add(tx.bankName);
  }
  return incoming.filter((tx) => {
    const banks = banksByKey.get(bankAgnosticKey(tx));
    return banks !== undefined && !banks.has(tx.bankName);
  }).length;
}

/**
 * Assigns a stable key to every transaction of one statement. Identical rows inside
 * the same statement (e.g. two equal coffees on the same day) get an occurrence
 * suffix, so they are kept instead of being dropped as duplicates, while uploading
 * the same statement again still yields the same keys.
 */
export function assignKeys(transactions) {
  const seen = new Map();
  return transactions.map((tx) => {
    const base = baseKey(tx);
    const occurrence = (seen.get(base) || 0) + 1;
    seen.set(base, occurrence);
    return { ...tx, key: occurrence === 1 ? base : `${base}#${occurrence}` };
  });
}
