/**
 * Reads the first sheet of a workbook as a matrix of raw cell values.
 * Row indexes are absolute (row 0 is the first sheet row) even when the used range
 * starts lower, so parsers can rely on fixed row positions.
 * @param {ArrayBuffer|Uint8Array} data
 * @param {object} XLSX the SheetJS module (injected so it can be loaded lazily)
 */
export function readFirstSheetRows(data, XLSX) {
  const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false, cellText: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  if (!sheet || !sheet['!ref']) return { rows: [], date1904 };

  const range = XLSX.utils.decode_range(sheet['!ref']);
  range.s.r = 0;
  range.s.c = 0;

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
    range
  });
  return { rows, date1904 };
}
