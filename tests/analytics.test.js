import { describe, expect, it } from 'vitest';
import {
  expenseBreakdown,
  expenseCents,
  filterTransactions,
  groupSources,
  incomeSourceLabel,
  isExpense,
  monthKeys,
  monthTotals,
  monthlyRows,
  periodPresets,
  sortTransactions,
  sourcesCaption
} from '../src/core/analytics.js';
import { categorize } from '../src/core/classifier.js';

const make = (date, description, amount, type = 'DEBIT', bankName = 'ING') =>
  categorize({ date, description, amount, type, bankName });

const transactions = [
  make('2026-05-01', 'MIGROS', 100.1),
  make('2026-05-02', 'MIGROS', 0.2),
  make('2026-05-03', 'STARBUCKS', 50),
  make('2026-05-05', 'MAAS', 1000, 'CREDIT'),
  make('2026-05-06', 'ATM PARA CEKME', 300),
  make('2026-05-07', 'HAVALE AHMET', 200),
  make('2026-04-10', 'NETFLIX', 99.99, 'DEBIT', 'Garanti')
];

describe('analytics', () => {
  it('excludes transfers, cash and investments from expenses', () => {
    expect(transactions.filter(isExpense).map((tx) => tx.description)).toEqual(['MIGROS', 'MIGROS', 'STARBUCKS', 'NETFLIX']);
  });

  it('lists months newest first', () => {
    expect(monthKeys(transactions)).toEqual(['2026-05', '2026-04']);
  });

  it('computes monthly totals without floating point drift', () => {
    expect(monthTotals(transactions, '2026-05')).toEqual({ debit: 150.3, credit: 1000, net: 849.7 });
    const [may, april] = monthlyRows(transactions);
    expect(may).toMatchObject({ month: '2026-05', debit: 150.3, credit: 1000, net: 849.7, creditPercent: 100 });
    expect(april).toMatchObject({ month: '2026-04', debit: 99.99, credit: 0, creditPercent: 0, debitPercent: 100 });
  });

  it('builds an expense breakdown that adds up to 100%', () => {
    const { items, total } = expenseBreakdown(transactions, '2026-05', 1);
    expect(total).toBe(150.3);
    expect(items.map((item) => item.code)).toEqual(['MARKET', 'OTHER_REST']);
    expect(items.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100);
    expect(items[0].label).toBe('Market');
  });

  it('groups sources by bank and label', () => {
    const sources = groupSources(transactions.filter(isExpense), (tx) => tx.description);
    expect(sources[0]).toMatchObject({ label: 'MIGROS', bankName: 'ING', count: 2, total: 100.3 });
    expect(sourcesCaption(sources, 'yok')).toBe('MIGROS +2');
    expect(sourcesCaption([], 'yok')).toBe('yok');
    expect(incomeSourceLabel(transactions[3])).toBe('Maaş');
  });

  it('filters with Turkish aware keyword search and date ranges', () => {
    const items = [make('2026-05-01', 'İSTANBUL KART', 10), make('2026-06-01', 'KAHVE', 5)];
    expect(filterTransactions(items, { keyword: 'istanbul' })).toHaveLength(1);
    expect(filterTransactions(items, { startDate: '2026-05-15' }).map((tx) => tx.description)).toEqual(['KAHVE']);
    expect(filterTransactions(items, { subCategory: 'COFFEE' }).map((tx) => tx.description)).toEqual(['KAHVE']);
  });

  it('sorts by amount and description', () => {
    expect(sortTransactions(transactions, 'amount', 'desc')[0].description).toBe('MAAS');
    expect(sortTransactions(transactions, 'amount', 'asc')[0].amount).toBe(0.2);
    expect(sortTransactions(transactions, 'date', 'asc')[0].date).toBe('2026-04-10');
    expect(sortTransactions(transactions, 'description', 'asc')[0].description).toBe('ATM PARA CEKME');
  });

  it('subtracts refunds from the spending of their category', () => {
    const items = [
      make('2026-06-01', 'HEPSIBURADA SIPARIS', 300),
      make('2026-06-05', 'HEPSIBURADA IADE', 120, 'CREDIT'),
      make('2026-06-06', 'MIGROS', 50),
      make('2026-06-07', 'NETFLIX IADE', 99, 'CREDIT')
    ];
    expect(monthTotals(items, '2026-06')).toEqual({ debit: 131, credit: 0, net: -131 });
    const { items: slices, total } = expenseBreakdown(items, '2026-06');
    expect(total).toBe(230);
    expect(slices.map((slice) => [slice.code, slice.total])).toEqual([['E_COMMERCE', 180], ['MARKET', 50]]);
    expect(groupSources(items.filter(isExpense), (tx) => tx.subCategory, expenseCents)[0]).toMatchObject({ label: 'E_COMMERCE', total: 180, count: 2 });
  });

  it('never reports negative spending for a month', () => {
    const items = [make('2026-07-01', 'HEPSIBURADA IADE', 500, 'CREDIT'), make('2026-07-02', 'MIGROS', 100)];
    expect(monthTotals(items, '2026-07').debit).toBe(0);
    expect(monthlyRows(items)[0].debit).toBe(0);
  });

  it('filters by amount range', () => {
    const items = [make('2026-05-01', 'A', 10), make('2026-05-02', 'B', 50), make('2026-05-03', 'C', 500)];
    expect(filterTransactions(items, { minAmount: '20', maxAmount: '' }).map((tx) => tx.description)).toEqual(['B', 'C']);
    expect(filterTransactions(items, { minAmount: '', maxAmount: '50' }).map((tx) => tx.description)).toEqual(['A', 'B']);
  });

  it('builds quick period ranges', () => {
    const presets = Object.fromEntries(periodPresets(new Date(2026, 0, 15)).map((p) => [p.id, [p.startDate, p.endDate]]));
    expect(presets).toEqual({
      'this-month': ['2026-01-01', '2026-01-31'],
      'last-month': ['2025-12-01', '2025-12-31'],
      'last-3-months': ['2025-11-01', '2026-01-31'],
      'this-year': ['2026-01-01', '2026-12-31']
    });
  });
});

