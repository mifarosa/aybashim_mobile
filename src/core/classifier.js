// Keyword based categorizer, a faithful port of the backend CategoryClassifier.
// Rule order matters: the first matching rule wins.

import { mainCategoryOf } from './categories.js';

const RULES = [
  ['ATM_WITHDRAWAL', ['atm para cekme', 'atm cekim', 'nakit cekim', 'nktcek', 'nkt cek', 'p.cekme', 'p cekme', 'qr ile p']],
  ['ATM_DEPOSIT', ['atm para yatirma', 'para yatirma']],
  ['BANK_FEE', ['komisyon', 'ucret', 'kesinti', 'masraf']],
  ['PUBLIC_TRANSPORT', ['istanbulkart', 'belbim', 'ulasim', 'metro', 'otobus']],
  ['TAXI', ['taksi', 'bitaksi', 'uber']],
  ['GOLD', [' alt:', 'altin', 'kiymetli maden']],
  ['SILVER', [' gms:', 'gumus alis', 'gumus satis']],
  ['FOREIGN_CURRENCY', ['doviz', 'usd', 'eur', 'dolar', 'euro']],
  ['INTERNET', ['internet', 'turknet', 'superonline', 'kablonet', 'ttnet']],
  ['MOBILE_PHONE', ['turkcell', 'vodafone', 'turk telekom']],
  ['ELECTRICITY', ['elektrik', 'bedas', 'aedas', 'aesas', 'enerjisa']],
  ['WATER', ['su faturasi', 'iski', 'aski']],
  ['NATURAL_GAS', ['dogalgaz', 'igdas', 'gazdas']],
  ['RENT', ['kira']],
  ['APARTMENT_FEE', ['aidat']],
  ['HOME_GOODS', ['bedding', 'yatak', 'mobilya', 'ev tekstili']],
  ['MARKET', ['market', 'migros', 'sok', 'bim ', 'bim-', 'a101', 'carrefour', 'hakmar', 'mopas', 'manav', 'tarim k', 'ennova', 'madencilik']],
  ['RESTAURANT', ['restoran', 'restaurant', 'yemeksepeti', 'getir yemek', 'trendyol yemek', 'doner', 'firin', 'gida', 'beltur', 'hd kadikoy', 'bufe', 'pideci', 'pastane', 'baklava', 'sutis', 'nevmekan', 'ceff res', 'emirgan', 'cikolatacisi']],
  ['COFFEE', ['kahve', 'kahvecisi', 'kafe', 'cafe', 'starbucks', 'coffee']],
  ['GENERAL_SHOPPING', ['sempati avm', 'tedi', 'rossm', 'rossmann']],
  ['E_COMMERCE', ['trendyol', 'hepsiburada', 'amazon', 'n11', 'e ticaret']],
  ['CLOTHING', ['giyim', 'lc waikiki', 'lcwaikiki', 'defacto', 'zara', 'mavi']],
  ['ELECTRONICS', ['teknosa', 'mediamarkt', 'vatan', 'elektronik']],
  ['FUEL', ['benzin', 'akaryakit', 'petrol', 'shell', 'shel ', 'opet', 'bp']],
  ['FLIGHT', ['thy', 'pegasus', 'ucak', 'flight']],
  ['TRAVEL', ['otel', 'booking', 'seyahat', 'obilet', 'pamukkale', 'havamas', 'havas']],
  ['PHARMACY', ['eczane', ' ecz ']],
  ['HOSPITAL', ['hastane', 'medical', 'saglik', 'tip merk', 'veteriner']],
  ['SPORTS_FITNESS', ['hali saha', 'halisaha', 'futbol', 'spor tes', 'cengiz topel', 'kanuni spor']],
  ['ONLINE_COURSE', ['udemy', 'coursera', 'kurs']],
  ['BOOK', ['kitap', 'kirtasiye', 'kitapyurdu', 'dr.com.tr']],
  ['EXAM_FEE', ['olcme secme', 'osym', 'sinav']],
  ['DIGITAL_SUBSCRIPTION', ['netflix', 'spotify', 'youtube', 'youtu', 'apple.com', 'ssportplus', 'abonelik', 'kayizer', 'sqsp', 'epic gam']],
  ['PET_CARE', ['petgoods', 'petshop', 'pet shop']],
  ['STOCK_FUND', ['hisse', 'fon', 'borsa', 'emeklilik']]
];

const DEBT_PAYMENT_KEYWORDS = [
  'yatirilan tesekkurler',
  'odeme icin tesekkurler',
  'k.kart',
  'k kart',
  'kredi karti odeme',
  'krdkrt odeme'
];

const INCOMING_TRANSFER_KEYWORDS = ['gelen eft', 'gelen havale', 'gelen fast'];

const TRANSFER_KEYWORDS = ['eft', 'havale', 'hvl', 'fast', 'para gonder'];

// Strips diacritics and folds Turkish dotted/dotless i, matching the backend normalization.
export function normalizeText(value) {
  if (value == null) return '';
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .toLowerCase();
}

const containsAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

function containsSelfTransferKeyword(description, selfTransferKeyword) {
  if (!selfTransferKeyword || !selfTransferKeyword.trim()) return false;
  const keyword = normalizeText(selfTransferKeyword).trim();
  return keyword.length > 0 && description.includes(keyword);
}

/**
 * Returns the sub category code for a transaction.
 * @param {{description: string, type: string, amount: number}} tx
 * @param {string} [selfTransferKeyword] user's full name, used to detect transfers between own accounts
 */
export function classify(tx, selfTransferKeyword) {
  const description = normalizeText(tx.description);
  const isCredit = String(tx.type).toUpperCase() === 'CREDIT';

  if (description.includes('maas') || description.includes('salary')) return 'SALARY';
  if (containsAny(description, DEBT_PAYMENT_KEYWORDS)) return 'DEBT_PAYMENT';
  if (description.includes('aidat')) return 'APARTMENT_FEE';
  if (description.includes('kira')) return 'RENT';
  if (description.includes('altin karsiligi')) return 'GIFT';

  const isTransfer = containsAny(description, TRANSFER_KEYWORDS);
  if (isTransfer && containsSelfTransferKeyword(description, selfTransferKeyword)) return 'SELF_TRANSFER';
  if (containsAny(description, INCOMING_TRANSFER_KEYWORDS)) return 'MONEY_RECEIVED';
  if (isTransfer) return isCredit ? 'MONEY_RECEIVED' : 'MONEY_SENT';

  for (const [subCategory, keywords] of RULES) {
    if (containsAny(description, keywords)) return subCategory;
  }

  if (isCredit && Number(tx.amount) > 0) return 'EXTRA_INCOME';
  return 'UNKNOWN';
}

/** Returns a copy of the transaction with subCategory and mainCategory filled in. */
export function categorize(tx, selfTransferKeyword) {
  const subCategory = classify(tx, selfTransferKeyword);
  return { ...tx, subCategory, mainCategory: mainCategoryOf(subCategory) };
}
