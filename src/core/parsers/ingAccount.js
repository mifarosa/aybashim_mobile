// ING account statement (PDF).
// A transaction starts with a "dd.MM.yyyy" line; following lines that do not start
// with a date are continuation lines of the same transaction description. Every
// transaction ends with "<signed amount> <balance>", both written as money with two
// decimals (e.g. "-1,400.00 28,612.39").
//
// The backend parser took the first two numbers after the date, which broke on
// descriptions containing numbers ("30 Eylül 2026 19:00", invoice numbers). This port
// takes the last money pair of the block instead.

import { parseDayMonthYear } from '../dates.js';
import { parseDotDecimal } from '../money.js';

const BLOCK_START = /^\d{2}\.\d{2}\.\d{4}/;
const DATE = /^(\d{2}\.\d{2}\.\d{4})\s+/;
const MONEY = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}`;
const AMOUNT_AND_BALANCE = new RegExp(String.raw`(?:^|\s)([+-]?${MONEY})\s+(-?${MONEY})(?=\s|$)`, 'g');

function splitBlocks(text) {
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
  return blocks;
}

function parseBlock(block, fileName) {
  const dateMatch = DATE.exec(block);
  if (!dateMatch) return null;
  const rest = block.slice(dateMatch[0].length);
  const matches = [...rest.matchAll(AMOUNT_AND_BALANCE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const before = rest.slice(0, last.index);
  const after = rest.slice(last.index + last[0].length);
  const description = `${before} ${after}`.replace(/\s+/g, ' ').trim();
  const signedAmount = parseDotDecimal(last[1]);
  if (!description || signedAmount == null) return null;

  return {
    date: parseDayMonthYear(dateMatch[1]),
    description,
    amount: Math.abs(signedAmount),
    type: signedAmount >= 0 ? 'CREDIT' : 'DEBIT',
    bankName: 'ING',
    sourceFile: fileName,
    balance: parseDotDecimal(last[2])
  };
}

export function parseIngAccount(text, fileName = '') {
  return splitBlocks(text).map((block) => parseBlock(block, fileName)).filter(Boolean);
}
