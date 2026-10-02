// Garanti BBVA account statement (XLS). Port of the backend GarantiParser.
// Works on a plain matrix of cell values so that it can be tested without a workbook.
// Columns: 0 = date, 1 = description, 3 = signed amount. Data starts at row index 15.

import { excelSerialToIsoDate, parseDayMonthYear } from '../dates.js';

export const FIRST_TRANSACTION_ROW = 15;

function parseDate(cell, date1904) {
  if (typeof cell === 'number') return excelSerialToIsoDate(cell, date1904);
  if (typeof cell === 'string') return parseDayMonthYear(cell);
  return null;
}

/**
 * @param {Array<Array<unknown>>} rows sheet rows with absolute indexes (row 0 = first sheet row)
 * @param {{fileName?: string, date1904?: boolean}} options
 */
export function parseGarantiRows(rows, { fileName = '', date1904 = false } = {}) {
  const transactions = [];

  for (let index = FIRST_TRANSACTION_ROW; index < rows.length; index++) {
    const row = rows[index];
    if (!row) continue;

    const [dateCell, descriptionCell, , amountCell] = row;
    if (dateCell == null || typeof amountCell !== 'number' || !Number.isFinite(amountCell)) continue;

    const date = parseDate(dateCell, date1904);
    if (!date) continue;

    transactions.push({
      date,
      description: descriptionCell == null ? '' : String(descriptionCell),
      amount: Math.abs(amountCell),
      type: amountCell >= 0 ? 'CREDIT' : 'DEBIT',
      bankName: 'Garanti',
      sourceFile: fileName
    });
  }
  return transactions;
}
