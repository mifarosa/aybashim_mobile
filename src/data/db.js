import Dexie from 'dexie';

export const DATABASE_NAME = 'aybashim';

/**
 * Local database. Only raw transactions are stored; categories are computed on read,
 * so changes to the classification rules or the user's name apply immediately.
 *
 * transactions: { key, date, description, amount, type, bankName, sourceFile, importId, importedAt, updatedAt }
 * imports:      { id, bankCode, fileName, importedAt, parsedCount, savedCount, duplicateCount, invalidCount }
 * settings:     { key, value }
 */
export function createDatabase(name = DATABASE_NAME) {
  const db = new Dexie(name);
  db.version(1).stores({
    transactions: '&key, date, bankName, importId',
    imports: '++id, importedAt',
    settings: '&key'
  });
  return db;
}
