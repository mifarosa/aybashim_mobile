import { describe, expect, it } from 'vitest';
import { categorize, classify, normalizeText } from '../src/core/classifier.js';

const tx = (description, type = 'DEBIT', amount = 10) => ({ description, type, amount });

describe('classifier', () => {
  // Ported from backend CategoryClassifierTests
  it('categorizes market descriptions with Turkish characters', () => {
    const result = categorize(tx('MİGROS MARKET'));
    expect(result.subCategory).toBe('MARKET');
    expect(result.mainCategory).toBe('FOOD');
  });

  it('categorizes self transfers when the user full name matches', () => {
    const result = categorize(tx('Gelen EFT Sample User', 'CREDIT'), 'Sample User');
    expect(result.subCategory).toBe('SELF_TRANSFER');
    expect(result.mainCategory).toBe('TRANSFER');
  });

  it('normalizes Turkish characters and case', () => {
    expect(normalizeText('İŞLEM ÇIKIŞ Ödeme ğ')).toBe('islem cikis odeme g');
    expect(normalizeText(null)).toBe('');
  });

  it('matches self transfers with a Turkish name written in capitals', () => {
    expect(classify(tx('FAST GÖNDERİM ŞÜKRÜ IŞIK'), 'Şükrü Işık')).toBe('SELF_TRANSFER');
  });

  it('does not treat a name match without a transfer keyword as a self transfer', () => {
    expect(classify(tx('Sample User MARKET'), 'Sample User')).toBe('MARKET');
  });

  it('applies the special rules before the keyword rules', () => {
    expect(classify(tx('MAAS ODEMESI', 'CREDIT'))).toBe('SALARY');
    expect(classify(tx('ODEME ICIN TESEKKURLER', 'CREDIT'))).toBe('DEBT_PAYMENT');
    expect(classify(tx('SITE AIDAT'))).toBe('APARTMENT_FEE');
    expect(classify(tx('EV KIRASI'))).toBe('RENT');
    expect(classify(tx('ALTIN KARSILIGI HEDIYE'))).toBe('GIFT');
  });

  it('splits transfers by direction', () => {
    expect(classify(tx('GELEN HAVALE AHMET', 'CREDIT'))).toBe('MONEY_RECEIVED');
    expect(classify(tx('HAVALE AHMET', 'DEBIT'))).toBe('MONEY_SENT');
    expect(classify(tx('FAST AHMET', 'CREDIT'))).toBe('MONEY_RECEIVED');
  });

  it('uses the first matching keyword rule', () => {
    expect(classify(tx('ATM PARA CEKME MIGROS'))).toBe('ATM_WITHDRAWAL');
    expect(classify(tx('NETFLIX.COM'))).toBe('DIGITAL_SUBSCRIPTION');
    expect(classify(tx('ECZANE DENIZ'))).toBe('PHARMACY');
  });

  it('falls back to extra income for unknown credits and unknown for debits', () => {
    expect(classify(tx('XYZ', 'CREDIT', 5))).toBe('EXTRA_INCOME');
    expect(classify(tx('XYZ', 'CREDIT', 0))).toBe('UNKNOWN');
    expect(classify(tx('XYZ', 'DEBIT'))).toBe('UNKNOWN');
  });
});
