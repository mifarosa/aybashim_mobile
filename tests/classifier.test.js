import { describe, expect, it } from 'vitest';
import { categorize, classify, mentionsName, normalizeText } from '../src/core/classifier.js';

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

  // Cases found on real statements.
  it('does not mistake fast food for a FAST transfer', () => {
    expect(classify(tx('EMRE FAST FOOD ISTANBUL'))).toBe('RESTAURANT');
    expect(classify(tx('FAST3263187-ALI VELI-', 'CREDIT'))).toBe('MONEY_RECEIVED');
    expect(classify(tx('MOBIL-FAST-1234567'))).toBe('MONEY_SENT');
  });

  it('matches short keywords only as whole words', () => {
    expect(classify(tx('BOSTANCI ALTINTEPE ISTANBUL'))).toBe('UNKNOWN');
    expect(classify(tx('KGV KIYMETLI MADEN ALIS'))).toBe('GOLD');
    expect(classify(tx('XYZ TELEFON AKSESUAR'))).toBe('UNKNOWN');
    expect(classify(tx('AGESA EMEKLILIK'))).toBe('STOCK_FUND');
    expect(classify(tx('SOK-KAYISDAGI ISTANBUL'))).toBe('MARKET');
    expect(classify(tx('BIM-G223-YEDITEPE'))).toBe('MARKET');
  });

  it('treats an annual card fee as a bank fee, not a card payment', () => {
    expect(classify(tx('YILLIK KART UCRETI'))).toBe('BANK_FEE');
    expect(classify(tx('K.KARTI ODEME'))).toBe('DEBT_PAYMENT');
    expect(classify(tx('MOBKRDKRT ODEME AD SOYAD'))).toBe('DEBT_PAYMENT');
  });

  it('fixes transport, foreign purchases, vets and groceries', () => {
    expect(classify(tx('TOPLU TASIMA UCRETI MERSIN'))).toBe('PUBLIC_TRANSPORT');
    expect(classify(tx('STEAMGAMES.COM BELLEVUE 12.99 USD'))).toBe('DIGITAL_SUBSCRIPTION');
    expect(classify(tx('MOBIL DOVIZ ALIS - USD'))).toBe('FOREIGN_CURRENCY');
    expect(classify(tx('INONU VETERINERLIK HIZMET'))).toBe('PET_CARE');
    expect(classify(tx('HAKIMLER GIDA ISTANBUL'))).toBe('MARKET');
    expect(classify(tx('MOKA U /YANDEX GO'))).toBe('TAXI');
    expect(classify(tx('TT MOBIL SOT:123/45'))).toBe('MOBILE_PHONE');
    expect(classify(tx('ISKIFO 123'))).toBe('WATER');
  });

  it('counts employer payments that arrive as transfers as income', () => {
    expect(classify(tx('GELEN HAVALE/ ACME TEKNOLOJI EMPLOYEE PAYMENT', 'CREDIT'))).toBe('EXTRA_INCOME');
  });

  it('uses notes on transfers', () => {
    expect(classify(tx('MOBIL-FAST-123 HALISAHA'))).toBe('SPORTS_FITNESS');
    expect(classify(tx('AD SOYAD-KENDIME-FAST-', 'CREDIT'))).toBe('SELF_TRANSFER');
    expect(classify(tx('SANAL KARTTAN PARA AKTARIMI', 'CREDIT'))).toBe('SELF_TRANSFER');
  });

  it('recognises the user name when it is glued or cut off', () => {
    expect(classify(tx('CEP SUBE-HVL-   -AYSE YILMA'), 'Ayşe Yılmaz')).toBe('SELF_TRANSFER');
    expect(classify(tx('GELEN HAVALE/ AYSEYILMAZ', 'CREDIT'), 'Ayşe Yılmaz')).toBe('SELF_TRANSFER');
    expect(classify(tx('HVL AYSE'), 'Ayşe Yılmaz')).toBe('MONEY_SENT');
    expect(mentionsName('hvl ayse y', 'Ayşe Yılmaz')).toBe(false);
    expect(mentionsName('fast ayse yilmaz ozturk', 'Ayşe Yılmaz')).toBe(true);
  });
});

