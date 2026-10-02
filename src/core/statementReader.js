// Browser side statement reading. pdf.js and SheetJS are large, so they are loaded
// only when a statement is actually imported.

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
      throw new Error('Dosya PDF olarak okunamadı. Doğru bankayı ve dosyayı seçtiğinizden emin olun.');
    }
    throw error;
  }
}

async function readXlsRows(buffer) {
  const XLSX = await import('@e965/xlsx');
  try {
    return readFirstSheetRows(buffer, XLSX);
  } catch {
    throw new Error('Dosya Excel olarak okunamadı. Doğru bankayı ve dosyayı seçtiğinizden emin olun.');
  }
}

/**
 * Reads and parses a statement file.
 * @param {File} file
 * @param {string} bankCode one of BANKS[].code
 * @returns {Promise<{transactions: object[], parsedCount: number, invalidCount: number, text: string|null}>}
 *   `text` is the extracted PDF text, kept so that parser problems can be diagnosed.
 */
export async function readStatement(file, bankCode) {
  const bank = findBank(bankCode);
  if (!bank) throw new Error(`Bilinmeyen banka: ${bankCode}`);
  if (file.size > MAX_FILE_BYTES) throw new Error('Dosya çok büyük (en fazla 20 MB).');

  const buffer = await file.arrayBuffer();

  if (bank.format === 'xls') {
    const { rows, date1904 } = await readXlsRows(buffer);
    return { ...prepareImport(parseGarantiRows(rows, { fileName: file.name, date1904 })), text: null };
  }

  const text = await readPdfText(buffer);
  return { ...prepareImport(parseStatementText(bank.code, text, file.name)), text };
}
