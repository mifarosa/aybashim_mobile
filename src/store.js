// Application state shared by all views (module singleton).

import { computed, reactive, shallowRef } from 'vue';
import { EMPTY_FILTERS, isSelfTransfer } from './core/analytics.js';
import { categorize } from './core/classifier.js';
import { loadStatement, parseLoadedStatement } from './core/statementReader.js';
import { countOtherBankMatches } from './core/transactions.js';
import { backupFileName, createBackup, parseBackup, restoreBackup } from './data/backup.js';
import { createDatabase } from './data/db.js';
import {
  DEFAULT_SETTINGS,
  clearAllData,
  deleteImport,
  listImports,
  listTransactions,
  loadSettings,
  saveImport,
  saveSettings
} from './data/repository.js';

const BACKUP_REMINDER_DAYS = 30;

const db = createDatabase();

export const state = reactive({
  ready: false,
  loadError: '',
  settings: { ...DEFAULT_SETTINGS },
  imports: [],
  // Session-only reveal toggle; settings.hideAmounts is the default applied on start.
  amountsHidden: true,
  tab: 'summary',
  summaryMonth: '',
  // Segment and filters handed over from another view (e.g. tapping a category on the summary).
  transactionsPreset: null,
  toast: null
});

const rawTransactions = shallowRef([]);

const categorized = computed(() => rawTransactions.value.map((tx) => categorize(tx, state.settings.fullName)));

/** Transactions without transfers between the user's own accounts. */
export const transactions = computed(() => categorized.value.filter((tx) => !isSelfTransfer(tx)));

export const selfTransfers = computed(() => categorized.value.filter(isSelfTransfer));

export const backupDue = computed(() => {
  if (rawTransactions.value.length === 0) return false;
  if (!state.settings.lastBackupAt) return true;
  const ageMs = Date.now() - new Date(state.settings.lastBackupAt).getTime();
  return ageMs > BACKUP_REMINDER_DAYS * 86400000;
});

let toastTimer = null;

export function notify(message, type = 'info') {
  clearTimeout(toastTimer);
  state.toast = { message, type, id: Date.now() };
  toastTimer = setTimeout(() => {
    state.toast = null;
  }, type === 'error' ? 6000 : 3500);
}

async function refreshData() {
  const [items, imports] = await Promise.all([listTransactions(db), listImports(db)]);
  rawTransactions.value = items;
  state.imports = imports;
}

const INIT_TIMEOUT_MS = 10000;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function init() {
  try {
    // Some in-app browsers never answer IndexedDB requests; fail visibly instead of hanging.
    await withTimeout((async () => {
      state.settings = await loadSettings(db);
      state.amountsHidden = state.settings.hideAmounts;
      await refreshData();
    })(), INIT_TIMEOUT_MS, 'Yerel veritabanı zamanında yanıt vermedi.');
  } catch (error) {
    state.loadError = error?.message || String(error);
  } finally {
    state.ready = true;
  }
}

export async function updateSettings(patch) {
  state.settings = await saveSettings(db, patch);
}

export async function completeOnboarding(fullName) {
  await updateSettings({ fullName: fullName.trim(), onboarded: true });
  await requestPersistentStorage();
}

/**
 * Switches to the transactions tab with a segment ("all", "expense", "income", "self")
 * and optional filters.
 */
export function openTransactions(segment = 'all', filters = {}) {
  state.transactionsPreset = { segment, filters: { ...EMPTY_FILTERS, ...filters } };
  state.tab = 'transactions';
}

export { loadStatement };

/**
 * Parses a statement loaded with loadStatement using the chosen bank and stores it.
 * @returns {Promise<object>} import result with saved, duplicate and invalid counts
 */
export async function importStatement(loaded, bankCode) {
  const parsed = parseLoadedStatement(loaded, bankCode);
  const otherBankMatches = countOtherBankMatches(parsed.transactions, rawTransactions.value);
  const result = await saveImport(db, {
    bankCode,
    fileName: loaded.fileName,
    transactions: parsed.transactions,
    parsedCount: parsed.parsedCount,
    invalidCount: parsed.invalidCount
  });
  await refreshData();
  return { ...result, otherBankMatches };
}

export async function removeImport(importId) {
  const removed = await deleteImport(db, importId);
  await refreshData();
  return removed;
}

export async function downloadBackup() {
  const backup = await createBackup(db);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const fileName = backupFileName();
  const file = new File([blob], fileName, { type: 'application/json' });

  // On phones the share sheet lets the user put the file into Drive, iCloud, mail, ...
  // Desktop browsers get a regular download.
  const touchDevice = window.matchMedia?.('(pointer: coarse)').matches;
  if (touchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'aybashim yedeği' });
    } catch (error) {
      if (error?.name === 'AbortError') return false;
      throw error;
    }
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  await updateSettings({ lastBackupAt: new Date().toISOString() });
  return true;
}

export async function restoreFromFile(file, mode) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Yedek dosyası okunamadı (geçerli bir JSON değil).');
  }
  const result = await restoreBackup(db, parseBackup(data), { mode });
  state.settings = await loadSettings(db);
  await refreshData();
  return result;
}

export async function wipeAllData() {
  await clearAllData(db);
  state.settings = await loadSettings(db);
  state.amountsHidden = state.settings.hideAmounts;
  state.tab = 'summary';
  await refreshData();
}

export async function requestPersistentStorage() {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return Boolean(await navigator.storage?.persist?.());
  } catch {
    return false;
  }
}

export async function storageStatus() {
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage?.persisted?.() ?? false,
      navigator.storage?.estimate?.() ?? null
    ]);
    return { persisted: Boolean(persisted), usage: estimate?.usage ?? null, quota: estimate?.quota ?? null };
  } catch {
    return { persisted: false, usage: null, quota: null };
  }
}
