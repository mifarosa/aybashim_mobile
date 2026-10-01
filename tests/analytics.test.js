import { describe, expect, it } from 'vitest';
import {
  expenseBreakdown,
  filterTransactions,
  groupSources,
  incomeSourceLabel,
  isExpense,
  monthKeys,
  monthTotals,
  monthlyRows,
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
});
