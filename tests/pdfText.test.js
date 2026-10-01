import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPdfText, itemsToLines } from '../src/core/pdfText.js';
import { parseStatementText, prepareImport } from '../src/core/parsers/index.js';

const PDF_OPTIONS = {
  isEvalSupported: false,
  standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/'
};

const item = (str, x, y, width = str.length * 5, size = 10) => ({
  str,
  transform: [size, 0, 0, size, x, y],
  width,
  height: size
});

describe('itemsToLines', () => {
  it('joins items on the same baseline and breaks lines when y changes', () => {
    const lines = itemsToLines([
      item('18/06/2026', 40, 700, 50),
      item('MIGROS', 120, 700, 35),
      item('538.00', 400, 700, 30),
      item('24/06/2026', 40, 680, 50),
      item('IADE', 120, 680, 20)
    ]);
    expect(lines).toEqual(['18/06/2026 MIGROS 538.00', '24/06/2026 IADE']);
  });

  it('does not insert spaces between glyph runs of the same word', () => {
    const lines = itemsToLines([item('MIG', 10, 500, 15), item('ROS', 25, 500, 15)]);
    expect(lines).toEqual(['MIGROS']);
  });

  it('keeps slightly shifted items of a row on the same line', () => {
    const lines = itemsToLines([item('01.05.2026', 10, 500), item('-125.50', 300, 502)]);
    expect(lines).toEqual(['01.05.2026 -125.50']);
  });

  it('treats whitespace-only items as word breaks and ignores empty EOL markers', () => {
    const lines = itemsToLines([
      item('A', 10, 500, 5),
      { str: ' ', transform: [0, 0, 0, 0, 0, 0], width: 0, height: 0 },
      item('B', 15, 500, 5),
      { str: '', transform: [10, 0, 0, 10, 20, 500], width: 0, height: 10, hasEOL: true }
    ]);
    expect(lines).toEqual(['A B']);
  });
});

async function buildStatementPdf(rows) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([595, 842]);
  let y = 780;
  for (const cells of rows) {
    // Every cell is drawn separately, like real statements laid out as table columns.
    for (const [x, text] of cells) page.drawText(text, { x, y, size: 9, font });
    y -= 16;
  }
  return document.save();
}

describe('extractPdfText (pdf.js integration)', () => {
  it('extracts statement rows that the Hadi parser understands', async () => {
    const pdf = await buildStatementPdf([
      [[40, 'Islem Tarihi'], [120, 'Islemler'], [450, 'Tutar (TL)']],
      [[40, '18/06/2026'], [120, 'A101*H121*ATAISTANBUL TR'], [450, '538.00']],
      [[40, '24/06/2026'], [120, 'ODEME ICIN TESEKKURLER'], [450, '+15,000.00']]
    ]);

    const text = await extractPdfText(pdf, pdfjs, PDF_OPTIONS);
    const result = prepareImport(parseStatementText('HADI', text, 'hadi.pdf'));

    expect(result.transactions.map(({ date, description, amount, type }) => ({ date, description, amount, type }))).toEqual([
      { date: '2026-06-18', description: 'A101*H121*ATAISTANBUL TR', amount: 538, type: 'DEBIT' },
      { date: '2026-06-24', description: 'ODEME ICIN TESEKKURLER', amount: 15000, type: 'CREDIT' }
    ]);
  });

  it('keeps multi-line ING account descriptions parseable', async () => {
    const pdf = await buildStatementPdf([
      [[40, '01.05.2026'], [110, 'MARKET ALISVERIS']],
      [[110, 'ISTANBUL'], [400, '-125.50'], [480, '1,000.00']],
      [[40, '02.05.2026'], [110, 'GELEN FAST'], [400, '250.00'], [480, '1,250.00']]
    ]);

    const text = await extractPdfText(pdf, pdfjs, PDF_OPTIONS);
    const result = prepareImport(parseStatementText('ING_ACCOUNT', text));

    expect(result.transactions.map((tx) => [tx.description, tx.amount, tx.type])).toEqual([
      ['MARKET ALISVERIS ISTANBUL', 125.5, 'DEBIT'],
      ['GELEN FAST', 250, 'CREDIT']
    ]);
  });

  it('rejects files that are not PDFs', async () => {
    await expect(extractPdfText(new TextEncoder().encode('not a pdf'), pdfjs)).rejects.toMatchObject({ name: 'InvalidPDFException' });
  });
});
