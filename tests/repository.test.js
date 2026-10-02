import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/data/db.js';
import { createBackup, parseBackup, restoreBackup } from '../src/data/backup.js';
import { clearAllData, deleteImport, listImports, listTransactions, loadSettings, saveImport, saveSettings } from '../src/data/repository.js';
import { prepareImport } from '../src/core/parsers/index.js';

let db;
let counter = 0;

const statement = (rows) => ({
  bankCode: 'HADI',
  fileName: 'hadi.pdf',
  ...prepareImport(rows.map(([date, description, amount, type = 'DEBIT']) => ({ date, description, amount, type, bankName: 'Hadi' })))
});

beforeEach(() => {
  db = createDatabase(`test-${++counter}`);
});

afterEach(async () => {
  await db.delete();
});

describe('repository', () => {
  it('saves an import and skips duplicates on re-import', async () => {
    const first = await saveImport(db, statement([['2026-05-01', 'KAHVE', 50], ['2026-05-01', 'KAHVE', 50], ['2026-05-02', 'MARKET', 10]]));
    expect(first).toMatchObject({ savedCount: 3, duplicateCount: 0 });

    const second = await saveImport(db, statement([['2026-05-02', 'MARKET', 10], ['2026-05-03', 'TAKSI', 80]]));
    expect(second).toMatchObject({ savedCount: 1, duplicateCount: 1 });

    const again = await saveImport(db, statement([['2026-05-03', 'TAKSI', 80]]));
    expect(again).toMatchObject({ savedCount: 0, duplicateCount: 1, importId: null });

    expect(await listTransactions(db)).toHaveLength(4);
    expect((await listImports(db)).map((item) => item.savedCount)).toEqual([1, 3]);
  });

  it('deletes an import with its transactions', async () => {
    const { importId } = await saveImport(db, statement([['2026-05-01', 'A', 1], ['2026-05-02', 'B', 2]]));
    await saveImport(db, statement([['2026-05-03', 'C', 3]]));

    expect(await deleteImport(db, importId)).toBe(2);
    expect((await listTransactions(db)).map((tx) => tx.description)).toEqual(['C']);
    expect(await listImports(db)).toHaveLength(1);
  });

  it('merges settings with defaults', async () => {
    expect(await loadSettings(db)).toMatchObject({ fullName: '', hideAmounts: true, onboarded: false });
    await saveSettings(db, { fullName: 'Ayşe Yılmaz' });
    await saveSettings(db, { onboarded: true });
    expect(await loadSettings(db)).toMatchObject({ fullName: 'Ayşe Yılmaz', onboarded: true, hideAmounts: true });
  });

  it('clears everything', async () => {
    await saveImport(db, statement([['2026-05-01', 'A', 1]]));
    await saveSettings(db, { onboarded: true });
    await clearAllData(db);
    expect(await listTransactions(db)).toHaveLength(0);
    expect((await loadSettings(db)).onboarded).toBe(false);
  });
});

describe('backup', () => {
  it('round trips through JSON into an empty database', async () => {
    await saveImport(db, statement([['2026-05-01', 'KAHVE', 50], ['2026-05-01', 'KAHVE', 50]]));
    await saveSettings(db, { fullName: 'Ayşe Yılmaz', onboarded: true });
    const json = JSON.parse(JSON.stringify(await createBackup(db)));

    const target = createDatabase(`test-${++counter}`);
    try {
      const result = await restoreBackup(target, parseBackup(json));
      expect(result).toEqual({ added: 2, duplicates: 0, skipped: 0 });
      const restored = await listTransactions(target);
      expect(restored.map((tx) => tx.key).sort()).toEqual([
        '2026-05-01|KAHVE|50.00|DEBIT|Hadi',
        '2026-05-01|KAHVE|50.00|DEBIT|Hadi#2'
      ]);
      const [importRecord] = await listImports(target);
      expect(restored.every((tx) => tx.importId === importRecord.id)).toBe(true);
      expect((await loadSettings(target)).fullName).toBe('Ayşe Yılmaz');
    } finally {
      await target.delete();
    }
  });

  it('merges without duplicating existing rows and remaps import ids', async () => {
    await saveImport(db, statement([['2026-05-01', 'A', 1]]));
    const backup = parseBackup(JSON.parse(JSON.stringify(await createBackup(db))));
    await saveImport(db, statement([['2026-05-02', 'B', 2]]));
    backup.transactions.push({ ...backup.transactions[0], key: '2026-05-03|C|3.00|DEBIT|Hadi', date: '2026-05-03', description: 'C', amount: 3 });

    const result = await restoreBackup(db, backup, { mode: 'merge' });

    expect(result).toMatchObject({ added: 1, duplicates: 1 });
    const imports = await listImports(db);
    expect(imports).toHaveLength(3);
    const c = (await listTransactions(db)).find((tx) => tx.description === 'C');
    expect(imports.map((item) => item.id)).toContain(c.importId);
  });

  it('replaces local data in replace mode', async () => {
    await saveImport(db, statement([['2026-05-01', 'A', 1]]));
    const backup = parseBackup(JSON.parse(JSON.stringify(await createBackup(db))));
    await saveImport(db, statement([['2026-05-02', 'B', 2]]));

    await restoreBackup(db, backup, { mode: 'replace' });

    expect((await listTransactions(db)).map((tx) => tx.description)).toEqual(['A']);
    expect(await listImports(db)).toHaveLength(1);
  });

  it('rejects foreign files and skips tampered rows', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow('aybashim yedeği değil');
    expect(() => parseBackup({ format: 'aybashim-backup', version: 99, transactions: [] })).toThrow('daha yeni');

    const parsed = parseBackup({
      format: 'aybashim-backup',
      version: 1,
      transactions: [
        { key: '2026-05-01|A|1.00|DEBIT|X', date: '2026-05-01', description: 'A', amount: 1, type: 'DEBIT', bankName: 'X' },
        { key: '2026-05-01|A|1.00|DEBIT|X', date: '2026-05-01', description: 'A', amount: 1, type: 'DEBIT', bankName: 'X' },
        { key: 'forged', date: '2026-05-01', description: 'B', amount: 1, type: 'DEBIT', bankName: 'X' },
        { key: '2026-05-01|C|-1.00|DEBIT|X', date: '2026-05-01', description: 'C', amount: -1, type: 'DEBIT', bankName: 'X' },
        null
      ]
    });
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.skipped).toBe(4);
  });
});
