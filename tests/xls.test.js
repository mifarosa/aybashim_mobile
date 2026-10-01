import { describe, expect, it } from 'vitest';
import * as XLSX from '@e965/xlsx';
import { parseGarantiRows } from '../src/core/parsers/garanti.js';
import { readFirstSheetRows } from '../src/core/xlsRows.js';

function buildGarantiXls() {
  const sheet = XLSX.utils.aoa_to_sheet([['Hesap Hareketleri']]);
  XLSX.utils.sheet_add_aoa(sheet, [['Tarih', 'Açıklama', 'Etiket', 'Tutar', 'Bakiye']], { origin: 'A14' });
  XLSX.utils.sheet_add_aoa(sheet, [
    [{ t: 'n', v: 46143, z: 'dd/mm/yyyy' }, 'MİGROS KADIKÖY', '', -182.8, 1000],
    ['02/05/2026', 'GELEN EFT AHMET', '', 2500, 3500]
  ], { origin: 'A16' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Hareketler');
  return XLSX.write(workbook, { type: 'array', bookType: 'biff8' });
}

describe('Garanti XLS reading', () => {
  it('reads a legacy .xls workbook end to end', () => {
    const { rows, date1904 } = readFirstSheetRows(buildGarantiXls(), XLSX);
    const transactions = parseGarantiRows(rows, { fileName: 'garanti.xls', date1904 });

    expect(transactions.map(({ date, description, amount, type }) => ({ date, description, amount, type }))).toEqual([
      { date: '2026-05-01', description: 'MİGROS KADIKÖY', amount: 182.8, type: 'DEBIT' },
      { date: '2026-05-02', description: 'GELEN EFT AHMET', amount: 2500, type: 'CREDIT' }
    ]);
  });

  it('keeps absolute row indexes when the used range does not start at A1', () => {
    const sheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(sheet, [['02/05/2026', 'X', '', -5]], { origin: 'C16' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'S');
    const { rows } = readFirstSheetRows(XLSX.write(workbook, { type: 'array', bookType: 'biff8' }), XLSX);
    expect(rows[15][2]).toBe('02/05/2026');
  });
});
