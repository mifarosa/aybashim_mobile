// Detects which bank a statement belongs to, so the user does not have to pick it.
//
// Strategy: bank markers in the text decide first (e.g. "ING Bank", "TOPLAM BORCUNUZ").
// When no marker is found, every parser of the file format is tried and the one that
// finds the most transactions wins. A tie between formats that look alike is reported
// as ambiguous and the user is asked to choose.

import { normalizeText } from './classifier.js';
import { BANKS, parseGarantiRows, parseStatementText, prepareImport } from './parsers/index.js';

const ING_MARKERS = ['ing bank', 'ing.com.tr', 'ing mobil'];
const ING_CREDIT_MARKERS = ['toplam borcunuz', 'asgari odeme', 'donem ici islemleri', 'kredi karti ekstre'];
const ING_ACCOUNT_MARKERS = ['hesap ekstresi', 'tarih aciklama tutar bakiye'];
const HADI_MARKERS = ['hadi kart', 'a101 hadi', 'hadi ekstre'];
const GARANTI_MARKERS = ['garanti bankasi', 'garanti bbva'];

const containsAny = (text, markers) => markers.some((marker) => text.includes(marker));

function countValid(bankCode, text) {
  return prepareImport(parseStatementText(bankCode, text)).transactions.length;
}

/**
 * @param {string} text extracted PDF text
 * @returns {{code: string|null, reason: 'marker'|'structure'|'ambiguous'|'none', counts: Record<string, number>}}
 */
export function detectPdfBank(text) {
  const counts = {};
  for (const bank of BANKS.filter((item) => item.format === 'pdf')) {
    counts[bank.code] = countValid(bank.code, text);
  }

  const normalized = normalizeText(text);
  const isIng = containsAny(normalized, ING_MARKERS);
  if (isIng) {
    if (containsAny(normalized, ING_CREDIT_MARKERS) && counts.ING_CREDIT > 0) {
      return { code: 'ING_CREDIT', reason: 'marker', counts };
    }
    if (containsAny(normalized, ING_ACCOUNT_MARKERS) && counts.ING_ACCOUNT > 0) {
      return { code: 'ING_ACCOUNT', reason: 'marker', counts };
    }
  }
  if (containsAny(normalized, HADI_MARKERS) && counts.HADI > 0) {
    return { code: 'HADI', reason: 'marker', counts };
  }
  // Both ING statement types carry ING markers, so a card-style PDF without them is Hadi.
  // The ING card parser also accepts most Hadi lines, which would otherwise tie.
  if (!isIng && counts.HADI > 0 && counts.HADI >= counts.ING_CREDIT && counts.HADI >= counts.ING_ACCOUNT) {
    return { code: 'HADI', reason: 'structure', counts };
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [[bestCode, bestCount], [, secondCount] = [null, 0]] = ranked;
  if (bestCount === 0) return { code: null, reason: 'none', counts };
  if (bestCount === secondCount) return { code: null, reason: 'ambiguous', counts };
  return { code: bestCode, reason: 'structure', counts };
}

/**
 * Garanti is the only supported spreadsheet format; the marker only raises confidence.
 * @param {Array<Array<unknown>>} rows
 */
export function detectXlsBank(rows, { date1904 = false } = {}) {
  const count = prepareImport(parseGarantiRows(rows, { date1904 })).transactions.length;
  const counts = { GARANTI: count };
  if (count === 0) return { code: null, reason: 'none', counts };
  const header = normalizeText(rows.slice(0, 15).flat().filter((cell) => typeof cell === 'string').join(' '));
  return { code: 'GARANTI', reason: containsAny(header, GARANTI_MARKERS) ? 'marker' : 'structure', counts };
}
