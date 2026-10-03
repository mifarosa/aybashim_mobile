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

/**
 * Version of each bank's parser. Bump it when a fix changes what an existing statement
 * parses into; imports made with an older version are flagged so the user re-imports them.
 * ING_ACCOUNT 2: amounts are taken from the end of the row (0.3.0).
 */
export const PARSER_VERSIONS = {
  ING_ACCOUNT: 2,
  ING_CREDIT: 1,
  HADI: 1,
  GARANTI: 1
};

/** True when an import was read by an older parser whose results may be wrong. */
export function isOutdatedImport(item) {
  const current = PARSER_VERSIONS[item?.bankCode];
  return current != null && (Number(item.parserVersion) || 1) < current;
}

export const FILE_ACCEPT = 'application/pdf,.pdf,application/vnd.ms-excel,.xls';

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
 * Zero amount rows (e.g. ING card lines that only spend bonus points) are not money
 * movements; they are dropped and not counted at all.
 * @returns {{transactions: object[], parsedCount: number, invalidCount: number}}
 */
export function prepareImport(rawTransactions) {
  const relevant = rawTransactions.filter((tx) => tx?.amount !== 0);
  const valid = relevant.map(normalizeTransaction).filter(Boolean);
  return {
    transactions: assignKeys(valid),
    parsedCount: relevant.length,
    invalidCount: relevant.length - valid.length
  };
}
