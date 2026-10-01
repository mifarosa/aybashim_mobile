// A101 Hadi card statement (PDF). Port of the backend HadiParser.
// Amounts prefixed with "+" are credits.

import { parseDayMonthYear } from '../dates.js';
import { parseDotDecimal } from '../money.js';

const LINE_PATTERN = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\+?[\d,]+\.\d{2})$/;

export function parseHadi(text, fileName = '') {
  const transactions = [];

  for (const rawLine of String(text).split(/\r\n|\r|\n/)) {
    const match = LINE_PATTERN.exec(rawLine.trim());
    if (!match) continue;

    transactions.push({
      date: parseDayMonthYear(match[1]),
      description: match[2].trim(),
      amount: parseDotDecimal(match[3]),
      type: match[3].startsWith('+') ? 'CREDIT' : 'DEBIT',
      bankName: 'Hadi',
      sourceFile: fileName
    });
  }
  return transactions;
}
