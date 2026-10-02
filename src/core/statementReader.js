// Browser side statement reading. pdf.js and SheetJS are large, so they are loaded
// only when a statement is actually imported.

import { detectPdfBank, detectXlsBank } from './detect.js';
import { extractPdfText } from './pdfText.js';
import { findBank, parseGarantiRows, parseStatementText, prepareImport } from './parsers/index.js';
import { readFirstSheetRows } from './xlsRows.js';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

let pdfjsPromise = null;

function loadPdfjs() {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  }).catch((error) => {
    pdfjsPromise = null;
    throw error;
  });
  return pdfjsPromise;
}

function pdfAssetOptions() {
  const base = import.meta.env.BASE_URL;
  return {
    cMapUrl: `${base}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
    isEvalSupported: false
  };
}

async function readPdfText(buffer) {
  const pdfjs = await loadPdfjs();
  try {
    return await extractPdfText(buffer, pdfjs, pdfAssetOptions());
  } catch (error) {
    if (error?.name === 'PasswordException') {
      throw new Error('PDF şifreli. Şifresiz bir ekstre yükleyin.');
    }
    if (error?.name === 'InvalidPDFException') {
      throw new Error('Dosya PDF olarak okunamadı. Bozuk ya da farklı türde bir dosya olabilir.');
    }
    throw error;
  }
}

async function readXlsRows(buffer) {
  const XLSX = await import('@e965/xlsx');
  try {
    return readFirstSheetRows(buffer, XLSX);
  } catch {
    throw new Error('Dosya Excel olarak okunamadı. Bozuk ya da farklı türde bir dosya olabilir.');
  }
}

function isSpreadsheet(file, bytes) {
  // Legacy .xls files are OLE compound documents (D0 CF 11 E0); .xlsx files are zip archives.
  const ole = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return ole || zip || /\.xlsx?$/i.test(file.name);
}

/**
 * Reads a statement file and guesses its bank.
 * @param {File} file
 * @returns {Promise<{fileName: string, format: 'pdf'|'xls', text: string|null, rows: Array|null,
 *   date1904: boolean, detection: {code: string|null, reason: string, counts: Record<string, number>}}>}
 */
export async function loadStatement(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error('Dosya çok büyük (en fazla 20 MB).');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));

  if (isSpreadsheet(file, bytes)) {
    const { rows, date1904 } = await readXlsRows(buffer);
    return { fileName: file.name, format: 'xls', text: null, rows, date1904, detection: detectXlsBank(rows, { date1904 }) };
  }

  const text = await readPdfText(buffer);
  return { fileName: file.name, format: 'pdf', text, rows: null, date1904: false, detection: detectPdfBank(text) };
}

/**
 * Parses a loaded statement with the chosen bank.
 * @returns {{transactions: object[], parsedCount: number, invalidCount: number}}
 */
export function parseLoadedStatement(loaded, bankCode) {
  const bank = findBank(bankCode);
  if (!bank) throw new Error(`Bilinmeyen banka: ${bankCode}`);
  if (bank.format !== loaded.format) {
    throw new Error(`${bank.label} ekstresi ${bank.format === 'xls' ? 'Excel' : 'PDF'} olmalı.`);
  }
  if (bank.format === 'xls') {
    return prepareImport(parseGarantiRows(loaded.rows, { fileName: loaded.fileName, date1904: loaded.date1904 }));
  }
  return prepareImport(parseStatementText(bank.code, loaded.text, loaded.fileName));
}
