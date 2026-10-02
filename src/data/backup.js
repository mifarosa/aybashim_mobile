// JSON backup / restore. Since data lives only on this device, a backup file is the
// user's only protection against losing it (lost phone, cleared browser data, ...).

import { baseKey, normalizeTransaction } from '../core/transactions.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './repository.js';

export const BACKUP_FORMAT = 'aybashim-backup';
export const BACKUP_VERSION = 1;

export async function createBackup(db) {
  const [transactions, imports, settings] = await Promise.all([
    db.transactions.toArray(),
    db.imports.toArray(),
    loadSettings(db)
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { fullName: settings.fullName, hideAmounts: settings.hideAmounts },
    imports,
    transactions: transactions.map(({ key, date, description, amount, type, bankName, sourceFile, importId, importedAt }) => (
      { key, date, description, amount, type, bankName, sourceFile, importId, importedAt }
    ))
  };
}

export function backupFileName(now = new Date()) {
  return `aybashim-yedek-${now.toISOString().slice(0, 10)}.json`;
}

// A stored key must be the transaction's own identity, optionally with an occurrence suffix.
function validKey(key, tx) {
  if (typeof key !== 'string') return null;
  const base = baseKey(tx);
  if (key === base) return key;
  return key.startsWith(base) && /^#\d+$/.test(key.slice(base.length)) ? key : null;
}

/** Validates a parsed backup object; throws a user facing error when it is not usable. */
export function parseBackup(data) {
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.transactions)) {
    throw new Error('Bu dosya bir aybashim yedeği değil.');
  }
  if (Number(data.version) > BACKUP_VERSION) {
    throw new Error('Yedek daha yeni bir uygulama sürümüyle alınmış. Uygulamayı güncelleyin.');
  }

  let skipped = 0;
  const transactions = [];
  const seenKeys = new Set();
  for (const raw of data.transactions) {
    const tx = normalizeTransaction(raw);
    const key = tx && validKey(raw?.key, tx);
    if (!key || seenKeys.has(key)) {
      skipped++;
      continue;
    }
    seenKeys.add(key);
    transactions.push({ ...tx, key, importId: Number.isInteger(raw.importId) ? raw.importId : null, importedAt: raw.importedAt || null });
  }

  const imports = (Array.isArray(data.imports) ? data.imports : [])
    .filter((item) => item && Number.isInteger(item.id))
    .map((item) => ({
      id: item.id,
      bankCode: String(item.bankCode || ''),
      fileName: String(item.fileName || ''),
      importedAt: String(item.importedAt || ''),
      parsedCount: Number(item.parsedCount) || 0,
      savedCount: Number(item.savedCount) || 0,
      duplicateCount: Number(item.duplicateCount) || 0,
      invalidCount: Number(item.invalidCount) || 0
    }));

  const settings = {
    fullName: typeof data.settings?.fullName === 'string' ? data.settings.fullName : DEFAULT_SETTINGS.fullName,
    hideAmounts: typeof data.settings?.hideAmounts === 'boolean' ? data.settings.hideAmounts : DEFAULT_SETTINGS.hideAmounts
  };

  return { transactions, imports, settings, skipped };
}

/**
 * Restores a validated backup.
 * mode "merge" keeps existing data and adds missing transactions (import ids are remapped),
 * mode "replace" wipes local data first.
 * @returns {Promise<{added: number, duplicates: number, skipped: number}>}
 */
export async function restoreBackup(db, backup, { mode = 'merge' } = {}) {
  return db.transaction('rw', db.transactions, db.imports, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.transactions.clear(), db.imports.clear()]);
    }

    const existingKeys = new Set(await db.transactions.toCollection().primaryKeys());
    const fresh = backup.transactions.filter((tx) => !existingKeys.has(tx.key));

    const idMap = new Map();
    for (const item of backup.imports) {
      const { id, ...rest } = item;
      const usedBy = fresh.some((tx) => tx.importId === id);
      if (!usedBy) continue;
      idMap.set(id, mode === 'replace' ? await db.imports.put({ id, ...rest }) : await db.imports.add(rest));
    }

    const now = Date.now();
    await db.transactions.bulkAdd(fresh.map((tx) => ({
      ...tx,
      importId: idMap.get(tx.importId) ?? null,
      updatedAt: now
    })));

    const current = await loadSettings(db);
    await saveSettings(db, mode === 'replace'
      ? { ...backup.settings, onboarded: true }
      : { fullName: current.fullName || backup.settings.fullName, onboarded: true });

    return { added: fresh.length, duplicates: backup.transactions.length - fresh.length, skipped: backup.skipped };
  });
}
