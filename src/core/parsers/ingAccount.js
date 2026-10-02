// ING account statement (PDF). Port of the backend IngAccountParser.
// A transaction starts with a "dd.MM.yyyy" line; following lines that do not start
// with a date are continuation lines of the same transaction description.

import { parseDayMonthYear } from '../dates.js';
import { parseDotDecimal } from '../money.js';

const BLOCK_START = /^\d{2}\.\d{2}\.\d{4}/;
const LINE_PATTERN = /^(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+([+-]?[\d,.]+)\s+[\d,.]+/;

export function parseIngAccount(text, fileName = '') {
  const blocks = [];
  let current = '';

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (BLOCK_START.test(line)) {
      if (current) blocks.push(current);
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) blocks.push(current);

  const transactions = [];
  for (const block of blocks) {
    const match = LINE_PATTERN.exec(block.trim());
    if (!match) continue;

    const signedAmount = parseDotDecimal(match[3]);
    transactions.push({
      date: parseDayMonthYear(match[1]),
      description: match[2].trim(),
      amount: signedAmount == null ? null : Math.abs(signedAmount),
      type: signedAmount != null && signedAmount >= 0 ? 'CREDIT' : 'DEBIT',
      bankName: 'ING',
      sourceFile: fileName
    });
  }
  return transactions;
}
