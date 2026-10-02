// Pure dashboard computations, ported from the web App.vue.
// All functions expect categorized transactions (see classifier.categorize).

import { CHART_COLORS, categoryLabel } from './categories.js';
import { currentMonthKey, monthKey, monthRange } from './dates.js';
import { fromCents, toCents } from './money.js';

const NON_EXPENSE_MAIN_CATEGORIES = ['INCOME', 'TRANSFER', 'CASH', 'INVESTMENT'];

export const isSelfTransfer = (tx) => tx.subCategory === 'SELF_TRANSFER';

/**
 * Spending categories, i.e. everything except income, transfers, cash and investments.
 * Credits in these categories are refunds (returned orders, gift balance used, friends
 * paying back their share) and reduce the spending of their category.
 */
export const isExpense = (tx) => !NON_EXPENSE_MAIN_CATEGORIES.includes(tx.mainCategory);

/** Spending of a transaction in cents: purchases count positive, refunds negative. */
export const expenseCents = (tx) => (tx.type === 'CREDIT' ? -1 : 1) * toCents(tx.amount);

export const isIncome = (tx) => tx.mainCategory === 'INCOME';

const trCollator = new Intl.Collator('tr', { sensitivity: 'base' });

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Months that have at least one transaction, newest first. */
export function monthKeys(transactions) {
  return uniqueSorted(transactions.map((tx) => monthKey(tx.date))).reverse();
}

// Bars never shrink below 4% for a non-zero value so that small amounts stay visible.
const barPercent = (value, max) => (value > 0 ? Math.max((value / max) * 100, 4) : 0);

/**
 * Income / expense totals per month, newest first.
 * @returns {Array<{month: string, credit: number, debit: number, net: number,
 *   creditPercent: number, debitPercent: number, netPercent: number}>}
 */
export function monthlyRows(transactions) {
  const totals = new Map();
  for (const tx of transactions) {
    const expense = isExpense(tx);
    const income = isIncome(tx);
    if (!expense && !income) continue;
    const month = monthKey(tx.date);
    const entry = totals.get(month) || { debit: 0, credit: 0 };
    if (expense) entry.debit += expenseCents(tx);
    if (income) entry.credit += toCents(tx.amount);
    totals.set(month, entry);
  }

  return monthKeys(transactions).map((month) => {
    const { debit: spent = 0, credit = 0 } = totals.get(month) || {};
    // A month where refunds exceed purchases has no spending rather than negative spending.
    const debit = Math.max(spent, 0);
    const net = credit - debit;
    const max = Math.max(debit, credit, Math.abs(net), 1);
    return {
      month,
      debit: fromCents(debit),
      credit: fromCents(credit),
      net: fromCents(net),
      debitPercent: barPercent(debit, max),
      creditPercent: barPercent(credit, max),
      netPercent: barPercent(Math.abs(net), max)
    };
  });
}

/** Income, expense and net of a single month. */
export function monthTotals(transactions, month) {
  let debit = 0;
  let credit = 0;
  for (const tx of transactions) {
    if (monthKey(tx.date) !== month) continue;
    if (isExpense(tx)) debit += expenseCents(tx);
    if (isIncome(tx)) credit += toCents(tx.amount);
  }
  debit = Math.max(debit, 0);
  return { debit: fromCents(debit), credit: fromCents(credit), net: fromCents(credit - debit) };
}

/**
 * Expense distribution of a month by sub category. The largest `limit` categories are
 * listed individually and the remainder is merged into a single "other" slice so that
 * the slices always add up to 100%.
 */
export function expenseBreakdown(transactions, month, limit = 8) {
  const totals = new Map();
  for (const tx of transactions) {
    if (!isExpense(tx) || monthKey(tx.date) !== month) continue;
    const code = tx.subCategory || 'UNKNOWN';
    totals.set(code, (totals.get(code) || 0) + expenseCents(tx));
  }

  // Categories fully offset by refunds are left out of the distribution.
  const sorted = [...totals.entries()].filter(([, cents]) => cents > 0).sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((sum, [, cents]) => sum + cents, 0);
  const head = sorted.slice(0, limit);
  const restTotal = sorted.slice(limit).reduce((sum, [, cents]) => sum + cents, 0);

  const items = head.map(([code, cents], index) => ({
    code,
    label: categoryLabel(code),
    total: fromCents(cents),
    percent: grandTotal > 0 ? (cents / grandTotal) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  if (restTotal > 0) {
    items.push({
      code: 'OTHER_REST',
      label: 'Diğer kategoriler',
      total: fromCents(restTotal),
      percent: (restTotal / grandTotal) * 100,
      color: '#cfd8dc'
    });
  }

  return { items, total: fromCents(grandTotal) };
}

export function expenseSourceLabel(tx) {
  return tx.subCategory ? categoryLabel(tx.subCategory) : tx.description || 'Bilinmeyen gider';
}

export function incomeSourceLabel(tx) {
  if (tx.subCategory === 'SALARY') return 'Maaş';
  if (tx.subCategory === 'DEBT_PAYMENT') return 'Kart ödemesi';
  if (tx.subCategory === 'MONEY_RECEIVED') return tx.description || 'Gelen transfer';
  return tx.description || categoryLabel(tx.subCategory) || 'Bilinmeyen gelir';
}

/**
 * Groups transactions by bank and label, largest total first.
 * @returns {Array<{key: string, label: string, bankName: string, total: number, count: number, category: string}>}
 */
export function groupSources(transactions, labelOf, centsOf = (tx) => toCents(tx.amount)) {
  const groups = new Map();
  for (const tx of transactions) {
    const label = labelOf(tx);
    const bankName = tx.bankName || '-';
    const key = `${bankName}|${label}`;
    const group = groups.get(key) || { key, label, bankName, cents: 0, count: 0, category: tx.subCategory };
    group.cents += centsOf(tx);
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.cents - a.cents)
    .map(({ cents, ...group }) => ({ ...group, total: fromCents(cents) }));
}

/** Short caption such as "Maaş +2" describing the sources of a month. */
export function sourcesCaption(sources, emptyText) {
  if (sources.length === 0) return emptyText;
  const [primary] = sources;
  return sources.length > 1 ? `${primary.label} +${sources.length - 1}` : primary.label;
}

export const EMPTY_FILTERS = Object.freeze({
  keyword: '',
  type: '',
  bankName: '',
  mainCategory: '',
  subCategory: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: ''
});

export function hasActiveFilters(filters) {
  return Object.keys(EMPTY_FILTERS).some((key) => filters[key]);
}

export function filterTransactions(transactions, filters) {
  const keyword = (filters.keyword || '').trim().toLocaleLowerCase('tr-TR');
  return transactions.filter((tx) => (
    (!keyword || (tx.description || '').toLocaleLowerCase('tr-TR').includes(keyword))
    && (!filters.type || tx.type === filters.type)
    && (!filters.bankName || tx.bankName === filters.bankName)
    && (!filters.mainCategory || tx.mainCategory === filters.mainCategory)
    && (!filters.subCategory || tx.subCategory === filters.subCategory)
    && (!filters.startDate || tx.date >= filters.startDate)
    && (!filters.endDate || tx.date <= filters.endDate)
    && (filters.minAmount === '' || filters.minAmount == null || tx.amount >= Number(filters.minAmount))
    && (filters.maxAmount === '' || filters.maxAmount == null || tx.amount <= Number(filters.maxAmount))
  ));
}

/**
 * Date ranges for the quick period buttons, relative to `now`.
 * @returns {Array<{id: string, label: string, startDate: string, endDate: string}>}
 */
export function periodPresets(now = new Date()) {
  const thisMonth = currentMonthKey(now);
  const [year, month] = thisMonth.split('-').map(Number);
  const shift = (offset) => {
    const date = new Date(year, month - 1 + offset, 1);
    return currentMonthKey(date);
  };
  const lastMonth = monthRange(shift(-1));
  return [
    { id: 'this-month', label: 'Bu ay', ...monthRange(thisMonth) },
    { id: 'last-month', label: 'Geçen ay', ...lastMonth },
    { id: 'last-3-months', label: 'Son 3 ay', start: monthRange(shift(-2)).start, end: monthRange(thisMonth).end },
    { id: 'this-year', label: 'Bu yıl', start: `${year}-01-01`, end: `${year}-12-31` }
  ].map(({ start, end, ...preset }) => ({ ...preset, startDate: start, endDate: end }));
}

const SORT_VALUES = {
  date: (tx) => tx.date || '',
  amount: (tx) => Number(tx.amount || 0),
  description: (tx) => tx.description || '',
  category: (tx) => categoryLabel(tx.subCategory)
};

/** Returns a sorted copy; ties fall back to newest date first. */
export function sortTransactions(transactions, key = 'date', direction = 'desc') {
  const valueOf = SORT_VALUES[key] || SORT_VALUES.date;
  const sign = direction === 'asc' ? 1 : -1;
  return [...transactions].sort((left, right) => {
    const a = valueOf(left);
    const b = valueOf(right);
    let result;
    if (typeof a === 'number') result = a - b;
    else if (key === 'date') result = a.localeCompare(b);
    else result = trCollator.compare(a, b);
    if (result === 0 && key !== 'date') return (right.date || '').localeCompare(left.date || '');
    return sign * result;
  });
}
