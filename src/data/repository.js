// Persistence operations on the local Dexie database.

export const DEFAULT_SETTINGS = Object.freeze({
  fullName: '',
  hideAmounts: true,
  onboarded: false,
  lastBackupAt: null
});

const SETTINGS_KEY = 'app';

/**
 * Stores a parsed statement. Rows whose key already exists are counted as duplicates.
 * Nothing is recorded in the import history when every row was a duplicate.
 */
export async function saveImport(db, { bankCode, fileName, transactions, parsedCount, invalidCount = 0 }) {
  return db.transaction('rw', db.transactions, db.imports, async () => {
    const keys = transactions.map((tx) => tx.key);
    const existing = new Set(await db.transactions.where('key').anyOf(keys).primaryKeys());
    const fresh = transactions.filter((tx) => !existing.has(tx.key));
    const result = {
      importId: null,
      parsedCount,
      invalidCount,
      savedCount: fresh.length,
      duplicateCount: transactions.length - fresh.length
    };
    if (fresh.length === 0) return result;

    const now = Date.now();
    const importedAt = new Date(now).toISOString();
    const importId = await db.imports.add({
      bankCode,
      fileName,
      importedAt,
      parsedCount,
      savedCount: fresh.length,
      duplicateCount: result.duplicateCount,
      invalidCount
    });
    await db.transactions.bulkAdd(fresh.map((tx) => ({ ...tx, importId, importedAt, updatedAt: now })));
    return { ...result, importId };
  });
}

export function listTransactions(db) {
  return db.transactions.toArray();
}

export async function listImports(db) {
  return (await db.imports.orderBy('importedAt').toArray()).reverse();
}

/** Removes an import together with every transaction it added. Returns the removed row count. */
export async function deleteImport(db, importId) {
  return db.transaction('rw', db.transactions, db.imports, async () => {
    const removed = await db.transactions.where('importId').equals(importId).delete();
    await db.imports.delete(importId);
    return removed;
  });
}

export async function clearAllData(db) {
  await db.transaction('rw', db.transactions, db.imports, db.settings, async () => {
    await Promise.all([db.transactions.clear(), db.imports.clear(), db.settings.clear()]);
  });
}

export async function loadSettings(db) {
  const row = await db.settings.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value || {}) };
}

export async function saveSettings(db, patch) {
  return db.transaction('rw', db.settings, async () => {
    const next = { ...(await loadSettings(db)), ...patch };
    await db.settings.put({ key: SETTINGS_KEY, value: next });
    return next;
  });
}
