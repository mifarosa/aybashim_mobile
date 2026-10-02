// ING credit card statement (PDF). Port of the backend IngCreditParser.
// A trailing "+" after the amount marks a credit (refund / payment).

import { parseDayMonthYear } from '../dates.js';
import { parseDotDecimal } from '../money.js';

const LINE_PATTERN = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,.]+)\s*(\+)?$/;
const TRAILING_NUMBER = /\s+\d+\.\d+$/;

export function parseIngCredit(text, fileName = '') {
  const transactions = [];

  for (const rawLine of String(text).split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(rawLine.trim());
    if (!match) continue;

    transactions.push({
      date: parseDayMonthYear(match[1]),
      description: match[2].trim().replace(TRAILING_NUMBER, '').trim(),
      amount: parseDotDecimal(match[3]),
      type: match[4] ? 'CREDIT' : 'DEBIT',
      bankName: 'ING',
      sourceFile: fileName
    });
  }
  return transactions;
}
