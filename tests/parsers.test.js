import { describe, expect, it } from 'vitest';
import { parseGarantiRows } from '../src/core/parsers/garanti.js';
import { parseHadi } from '../src/core/parsers/hadi.js';
import { parseIngAccount } from '../src/core/parsers/ingAccount.js';
import { parseIngCredit } from '../src/core/parsers/ingCredit.js';
import { parseStatementText, prepareImport } from '../src/core/parsers/index.js';
import { countOtherBankMatches } from '../src/core/transactions.js';

describe('Hadi parser', () => {
  // Ported from backend HadiParserTests
  it('parses Hadi card statement lines', () => {
    const text = [
      'İşlem Tarihi İşlemler Tutar (TL) Kalan Tutar/Taksit',
      '18/06/2026 A101*H121*NAECICEGI*ATAISTANBUL TR 538.00',
      '24/06/2026 ODEME ICIN TESEKKURLER +15,000.00',
      '03/07/2026 MIGROS*150226*USKUDAR ISTANBUL TR 182.80',
      'Toplam 391.93'
    ].join('\n');

    const transactions = parseHadi(text, 'hadi.pdf');

    expect(transactions).toHaveLength(3);
    expect(transactions[0]).toEqual({
      date: '2026-06-18',
      description: 'A101*H121*NAECICEGI*ATAISTANBUL TR',
      amount: 538,
      type: 'DEBIT',
      bankName: 'Hadi',
      sourceFile: 'hadi.pdf'
    });
    expect(transactions[1].amount).toBe(15000);
    expect(transactions[1].type).toBe('CREDIT');
  });
});

describe('ING account parser', () => {
  // Ported from backend IngAccountParserTests
  it('parses multiline account transactions', () => {
    const text = '01.05.2026 MARKET ALISVERIS\nISTANBUL -125.50 1000.00\n02.05.2026 GELEN FAST 250.00 1250.00\n';

    const transactions = parseIngAccount(text, 'ing-account.pdf');

    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('MARKET ALISVERIS ISTANBUL');
    expect(transactions[0].amount).toBe(125.5);
    expect(transactions[0].type).toBe('DEBIT');
    expect(transactions[0].date).toBe('2026-05-01');
    expect(transactions[1].type).toBe('CREDIT');
    expect(transactions[1].bankName).toBe('ING');
  });

  it('handles thousands separators and Windows line endings', () => {
    const transactions = parseIngAccount('03.05.2026 KIRA ODEMESI -12,500.00 3,250.75\r\n');
    expect(transactions[0].amount).toBe(12500);
    expect(transactions[0].description).toBe('KIRA ODEMESI');
  });
});

describe('ING credit card parser', () => {
  // Ported from backend IngCreditParserTests
  it('parses debit and credit lines', () => {
    const text = '01/05/2026 MIGROS MARKET 123.45\n02/05/2026 IADE ISLEMI 10.00 +\n';

    const transactions = parseIngCredit(text, 'ing.pdf');

    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('MIGROS MARKET');
    expect(transactions[0].amount).toBe(123.45);
    expect(transactions[0].type).toBe('DEBIT');
    expect(transactions[1].type).toBe('CREDIT');
  });

  it('drops a trailing number column from the description', () => {
    const [transaction] = parseIngCredit('05/05/2026 TEKNOSA 3/6 1.25 1,999.90');
    expect(transaction.description).toBe('TEKNOSA 3/6');
    expect(transaction.amount).toBe(1999.9);
  });
});

describe('Garanti parser', () => {
  const header = Array.from({ length: 15 }, (_, index) => (index === 3 ? ['Tarih', 'Açıklama', 'Etiket', 'Tutar'] : []));

  it('parses rows from index 15 with serial and text dates', () => {
    const rows = [
      ...header,
      [46143, 'MIGROS ISTANBUL', null, -182.8],
      ['02/05/2026', 'GELEN EFT', null, 2500],
      [null, 'Devreden bakiye', null, 100],
      ['Toplam', null, null, 999],
      [46145, 'TEXT AMOUNT', null, '12,00']
    ];

    const transactions = parseGarantiRows(rows, { fileName: 'garanti.xls' });

    expect(transactions).toEqual([
      { date: '2026-05-01', description: 'MIGROS ISTANBUL', amount: 182.8, type: 'DEBIT', bankName: 'Garanti', sourceFile: 'garanti.xls' },
      { date: '2026-05-02', description: 'GELEN EFT', amount: 2500, type: 'CREDIT', bankName: 'Garanti', sourceFile: 'garanti.xls' }
    ]);
  });

  it('ignores rows before the first transaction row', () => {
    const rows = [[46143, 'HEADER LIKE', null, 5], ...header.slice(1)];
    expect(parseGarantiRows(rows)).toEqual([]);
  });

  it('supports the 1904 date system', () => {
    const rows = [...header, [44681, 'X', null, -1]];
    expect(parseGarantiRows(rows, { date1904: true })[0].date).toBe('2026-05-01');
  });
});

describe('prepareImport', () => {
  it('drops invalid rows and assigns stable keys with occurrence suffixes', () => {
    const raw = [
      { date: '2026-05-01', description: ' KAHVE ', amount: 50, type: 'DEBIT', bankName: 'ING', sourceFile: 'a.pdf' },
      { date: '2026-05-01', description: 'KAHVE', amount: 50, type: 'DEBIT', bankName: 'ING', sourceFile: 'a.pdf' },
      { date: null, description: 'BAD DATE', amount: 1, type: 'DEBIT' },
      { date: '2026-05-02', description: '', amount: 1, type: 'DEBIT' },
      { date: '2026-05-02', description: 'NO AMOUNT', amount: null, type: 'DEBIT' }
    ];

    const result = prepareImport(raw);

    expect(result.parsedCount).toBe(5);
    expect(result.invalidCount).toBe(3);
    expect(result.transactions.map((tx) => tx.key)).toEqual([
      '2026-05-01|KAHVE|50.00|DEBIT|ING',
      '2026-05-01|KAHVE|50.00|DEBIT|ING#2'
    ]);
  });

  it('skips lines with impossible dates instead of failing the whole statement', () => {
    const raw = parseStatementText('HADI', '31/02/2026 HATALI 10.00\n01/03/2026 DOGRU 10.00');
    const result = prepareImport(raw);
    expect(result.transactions).toHaveLength(1);
    expect(result.invalidCount).toBe(1);
  });

  it('counts rows that already exist under another bank name', () => {
    const existing = [
      { date: '2026-05-01', description: 'KAHVE', amount: 50, type: 'DEBIT', bankName: 'Hadi' },
      { date: '2026-05-02', description: 'MARKET', amount: 10, type: 'DEBIT', bankName: 'ING' }
    ];
    const incoming = [
      { date: '2026-05-01', description: 'KAHVE', amount: 50, type: 'DEBIT', bankName: 'ING' },
      { date: '2026-05-02', description: 'MARKET', amount: 10, type: 'DEBIT', bankName: 'ING' },
      { date: '2026-05-03', description: 'YENI', amount: 1, type: 'DEBIT', bankName: 'ING' }
    ];
    expect(countOtherBankMatches(incoming, existing)).toBe(1);
  });

  it('rejects unknown banks', () => {
    expect(() => parseStatementText('UNKNOWN', '')).toThrow('Bilinmeyen banka');
  });
});
