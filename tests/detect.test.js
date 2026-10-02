import { describe, expect, it } from 'vitest';
import { detectPdfBank, detectXlsBank } from '../src/core/detect.js';

// Synthetic statements that only reproduce the layout and bank markers of real ones.
const ING_CREDIT_TEXT = [
  'Sayın AD SOYAD',
  'SON ÖDEME TARİHİ : 11/05/2026',
  'TOPLAM BORCUNUZ : 1,000.00 TL 0.00 USD',
  'ASGARİ ÖDEME TUTARI : 200.00 TL 0.00 USD',
  "Kredi Kartınızla Taksitli Avans'ınızı ATM veya ING Mobil'den hemen alın! www.ing.com.tr",
  'İŞLEM TARİHİ DÖNEM İÇİ İŞLEMLERİ Puan TL TUTAR USD TUTAR',
  '01/04/2026 HAKMAR MAGAZACILIK LTD ST ISTANBUL 82.50',
  '02/04/2026 YATIRILAN TESEKKURLER BURSA 500.00 +',
  '03/04/2026 7611-ISTANBUL ÜMRANIYE YI ISTANBUL 0.01 120.00'
].join('\n');

const ING_ACCOUNT_TEXT = [
  'Hesap Ekstresi / Cüzdanı',
  'Tarih Açıklama Tutar Bakiye',
  '03.07.2026 Giden FAST AD SOYAD -2,000.00 39,260.24',
  '03.04.2026 MAAS Salary Payment 52,146.00 52,146.00',
  'www.ing.com.tr',
  'Ticaret Ünvanı:ING Bank Anonim Şirketi'
].join('\n');

const HADI_TEXT = [
  'İşlem Tarihi İşlemler Tutar (TL) Kalan Tutar/Taksit',
  '18/06/2026 A101*H121*ATAISTANBUL TR 538.00',
  '24/06/2026 ODEME ICIN TESEKKURLER +15,000.00',
  '03/07/2026 MIGROS*USKUDAR ISTANBUL TR 182.80'
].join('\n');

describe('detectPdfBank', () => {
  it('detects ING credit card statements by their markers', () => {
    const result = detectPdfBank(ING_CREDIT_TEXT);
    expect(result).toMatchObject({ code: 'ING_CREDIT', reason: 'marker' });
    expect(result.counts.ING_CREDIT).toBe(3);
  });

  it('detects ING account statements by their markers', () => {
    expect(detectPdfBank(ING_ACCOUNT_TEXT)).toMatchObject({ code: 'ING_ACCOUNT', reason: 'marker' });
  });

  it('treats card style statements without ING markers as Hadi', () => {
    const result = detectPdfBank(HADI_TEXT);
    expect(result).toMatchObject({ code: 'HADI', reason: 'structure' });
    expect(result.counts.HADI).toBe(3);
  });

  it('still resolves Hadi when every line also fits the ING card format', () => {
    const debitsOnly = HADI_TEXT.split('\n').filter((line) => !line.includes('+')).join('\n');
    expect(detectPdfBank(debitsOnly)).toMatchObject({ code: 'HADI', reason: 'structure' });
  });

  it('reports ING card lines without a statement type marker as ambiguous', () => {
    const text = 'www.ing.com.tr\n01/04/2026 MARKET 10.00\n02/04/2026 KAFE 20.00';
    expect(detectPdfBank(text)).toMatchObject({ code: null, reason: 'ambiguous' });
  });

  it('falls back to the parser with the most rows', () => {
    const text = 'www.ing.com.tr\n03.07.2026 MARKET -10.00 90.00\n04.07.2026 KAFE -5.00 85.00';
    expect(detectPdfBank(text)).toMatchObject({ code: 'ING_ACCOUNT', reason: 'structure' });
  });

  it('returns nothing for unrelated documents', () => {
    expect(detectPdfBank('Fatura\nToplam 100 TL')).toMatchObject({ code: null, reason: 'none' });
  });
});

describe('detectXlsBank', () => {
  const header = Array.from({ length: 15 }, () => []);
  const rows = [...header, ['07/07/2026', 'TRENDYOL', 'Alışveriş', -409.99, 3298.51]];

  it('detects Garanti by its header', () => {
    const withBank = [['', 'T. GARANTİ BANKASI A.Ş.'], ...rows.slice(1)];
    expect(detectXlsBank(withBank)).toMatchObject({ code: 'GARANTI', reason: 'marker', counts: { GARANTI: 1 } });
  });

  it('accepts the Garanti layout without the header marker', () => {
    expect(detectXlsBank(rows)).toMatchObject({ code: 'GARANTI', reason: 'structure' });
  });

  it('returns nothing for spreadsheets without transactions', () => {
    expect(detectXlsBank([['a', 'b']])).toMatchObject({ code: null, reason: 'none' });
  });
});
