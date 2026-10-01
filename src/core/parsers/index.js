import { assignKeys, normalizeTransaction } from '../transactions.js';
import { parseHadi } from './hadi.js';
import { parseIngAccount } from './ingAccount.js';
import { parseIngCredit } from './ingCredit.js';

export { parseGarantiRows } from './garanti.js';

export const BANKS = [
  { code: 'ING_ACCOUNT', label: 'ING Hesap', detail: 'Hesap ekstresi · PDF', mark: 'IA', format: 'pdf' },
  { code: 'ING_CREDIT', label: 'ING Kredi Kartı', detail: 'Kart ekstresi · PDF', mark: 'IK', format: 'pdf' },
  { code: 'HADI', label: 'A101 Hadi', detail: 'Kart ekstresi · PDF', mark: 'HD', format: 'pdf' },
  { code: 'GARANTI', label: 'Garanti BBVA', detail: 'Hesap ekstresi · XLS', mark: 'GB', format: 'xls' }
];

export const FILE_ACCEPT = {
  pdf: 'application/pdf,.pdf',
  xls: 'application/vnd.ms-excel,.xls'
};

const TEXT_PARSERS = {
  ING_ACCOUNT: parseIngAccount,
  ING_CREDIT: parseIngCredit,
  HADI: parseHadi
};

export function findBank(code) {
  return BANKS.find((bank) => bank.code === code) || null;
}

export function parseStatementText(bankCode, text, fileName = '') {
  const parser = TEXT_PARSERS[bankCode];
  if (!parser) throw new Error(`Bilinmeyen banka: ${bankCode}`);
  return parser(text, fileName);
}

/**
 * Validates raw parser output and assigns duplicate detection keys.
 * @returns {{transactions: object[], parsedCount: number, invalidCount: number}}
 */
export function prepareImport(rawTransactions) {
  const valid = rawTransactions.map(normalizeTransaction).filter(Boolean);
  return {
    transactions: assignKeys(valid),
    parsedCount: rawTransactions.length,
    invalidCount: rawTransactions.length - valid.length
  };
}
