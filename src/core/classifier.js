// Keyword based categorizer, ported from the backend CategoryClassifier and refined with
// real statements. Rule order matters: the first matching rule wins.
//
// Keywords are matched against the normalized description (lower case, no diacritics).
// A string matches anywhere (bank codes are often glued to other text, e.g.
// "USKUDNKTCEK"); a RegExp is used for short or ambiguous words that must stand alone
// ("fast" but not "fast food", "altin" but not "altintepe", "fon" but not "telefon").

import { mainCategoryOf } from './categories.js';

// A word must not be glued to other letters; digits are allowed around it because banks
// glue reference numbers to keywords ("FAST3263...", "A101-8811"). Lookbehind is avoided
// for older Safari versions.
const word = (text) => new RegExp(`(?:^|[^a-z])${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`);

const RULES = [
  ['ATM_WITHDRAWAL', ['atm para cekme', 'atm cekim', 'nakit cekim', 'nktcek', 'nkt cek', 'p.cekme', 'p cekme', 'qr ile p']],
  ['ATM_DEPOSIT', ['atm para yatirma', 'para yatirma']],
  // Before bank fees: "toplu tasima ucreti" is a fare, not a bank charge.
  ['PUBLIC_TRANSPORT', ['istanbulkart', 'belbim', 'ulasim', 'toplu tasima', 'marmaray', 'izban', word('iett'), word('metro'), 'otobus']],
  ['BANK_FEE', ['komisyon', 'ucret', 'kesinti', 'masraf']],
  ['TAXI', ['taksi', 'bitaksi', 'uber', 'yandex go', 'takside']],
  ['GOLD', [' alt:', word('altin'), 'kiymetli maden']],
  ['SILVER', [' gms:', 'gumus alis', 'gumus satis']],
  // Plain "usd" / "eur" are not used: card purchases abroad also show the currency.
  ['FOREIGN_CURRENCY', ['doviz alis', 'doviz satis', word('dth')]],
  ['INTERNET', ['internet', 'turknet', 'superonline', 'kablonet', 'ttnet']],
  ['MOBILE_PHONE', ['turkcell', 'vodafone', 'turk telekom', 'tt mobil']],
  ['ELECTRICITY', ['elektrik', 'bedas', 'aedas', 'aesas', 'enerjisa']],
  ['WATER', ['su faturasi', /(?:^|[^a-z])iski/, word('aski')]],
  ['NATURAL_GAS', ['dogalgaz', 'igdas', 'gazdas']],
  ['RENT', ['kira']],
  ['APARTMENT_FEE', ['aidat']],
  ['HOME_GOODS', ['bedding', 'yatak', 'mobilya', 'ev tekstili', 'ikea', 'koctas', 'bauhaus', 'yapi market']],
  ['MARKET', ['market', 'migros', word('sok'), word('bim'), 'a101', 'carrefour', 'hakmar', 'mopas', 'manav', 'tarim k', 'ennova', 'madencilik', word('gida'), 'ciftligi', 'kasap', 'sarkuteri']],
  ['RESTAURANT', ['restoran', 'restaurant', 'yemeksepeti', 'getir yemek', 'trendyol yemek', 'doner', 'firin', 'beltur', 'hd kadikoy', 'bufe', 'pideci', 'pastane', 'baklava', 'sutis', 'nevmekan', 'ceff res', 'emirgan', 'cikolatacisi', word('food'), 'pizza', 'burger', 'kebap', 'lokanta', 'yiyec', word('cig'), 'kofte']],
  ['COFFEE', ['kahve', 'kahvecisi', 'kafe', 'cafe', 'starbucks', 'coffee']],
  ['GENERAL_SHOPPING', ['sempati avm', word('tedi'), 'rossm', 'rossmann', word('avm')]],
  ['E_COMMERCE', ['trendyol', 'hepsiburada', 'amazon', word('n11'), 'e ticaret']],
  ['CLOTHING', ['giyim', 'lc waikiki', 'lcwaikiki', 'defacto', word('zara'), word('mavi')]],
  ['ELECTRONICS', ['teknosa', 'mediamarkt', word('vatan'), 'elektronik']],
  ['FUEL', ['benzin', 'akaryakit', 'petrol', 'shell', 'shel ', 'opet', word('bp')]],
  ['FLIGHT', [word('thy'), 'pegasus', 'ucak', 'flight', 'ajet', 'sunexpress']],
  ['TRAVEL', [word('otel'), 'hotel', 'booking', 'seyahat', 'obilet', 'pamukkale', 'havamas', 'havas', 'kamil koc', 'metro turizm']],
  ['PHARMACY', ['eczane', ' ecz ']],
  ['HOSPITAL', ['hastane', 'medical', 'saglik', 'tip merk']],
  ['SPORTS_FITNESS', ['hali saha', 'halisaha', 'futbol', 'spor tes', 'cengiz topel', 'kanuni spor']],
  ['ONLINE_COURSE', ['udemy', 'coursera', word('kurs')]],
  ['BOOK', ['kitap', 'kirtasiye', 'kitapyurdu', 'dr.com.tr']],
  ['EXAM_FEE', ['olcme secme', 'osym', word('sinav')]],
  ['DIGITAL_SUBSCRIPTION', ['netflix', 'spotify', 'youtube', 'youtu', 'apple.com', 'ssportplus', 'abonelik', 'kayizer', 'sqsp', 'epic gam', 'steam', 'disney']],
  ['PET_CARE', ['petgoods', 'petshop', 'pet shop', 'veteriner', word('yem')]],
  ['STOCK_FUND', ['hisse', word('fon'), word('fonu'), 'borsa', 'emeklilik']]
];

const DEBT_PAYMENT_KEYWORDS = [
  'yatirilan tesekkurler',
  'odeme icin tesekkurler',
  /(?:^|[^a-z])k[. ]?karti? odeme/,
  'kredi karti odeme',
  'krdkrt odeme'
];

// Notes that mark a transfer between the user's own accounts.
const SELF_TRANSFER_KEYWORDS = ['kendime', 'sanal karttan', 'hesaplarim arasi'];

// Payments from an employer that arrive as a regular transfer.
const EMPLOYER_PAYMENT_KEYWORDS = ['employee payment', 'ikramiye', 'prim odeme'];

// Transfers that carry a note naming what they paid for.
const NOTED_TRANSFER_RULES = [
  ['SPORTS_FITNESS', ['halisaha', 'hali saha']]
];

const INCOMING_TRANSFER_KEYWORDS = ['gelen eft', 'gelen havale', 'gelen fast'];

const TRANSFER_KEYWORDS = [word('eft'), word('havale'), word('hvl'), /(?:^|[^a-z])fast(?![a-z])(?!\s*food)/, 'para gonder', word('virman')];

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

const matches = (text, keyword) => (typeof keyword === 'string' ? text.includes(keyword) : keyword.test(text));
const containsAny = (text, keywords) => keywords.some((keyword) => matches(text, keyword));

/**
 * True when the description names the user. Besides the plain name it accepts the name
 * written without spaces ("FARUKGUL") and a name cut off at the end of a fixed width
 * column ("MEHMET FARUK GU"), as long as most of the last word is present.
 */
export function mentionsName(description, fullName) {
  const name = normalizeText(fullName).replace(/\s+/g, ' ').trim();
  if (!name) return false;
  const text = description.replace(/\s+/g, ' ').trim();
  if (text.includes(name)) return true;

  const compactName = name.replace(/ /g, '');
  if (compactName.length >= 6 && text.replace(/ /g, '').includes(compactName)) return true;

  const words = name.split(' ');
  if (words.length < 2) return false;
  const lastWord = words[words.length - 1];
  const minLength = name.length - lastWord.length + Math.min(2, lastWord.length);
  for (let length = name.length - 1; length >= minLength; length--) {
    if (text.endsWith(name.slice(0, length))) return true;
  }
  return false;
}

/**
 * Returns the sub category code for a transaction.
 * @param {{description: string, type: string, amount: number}} tx
 * @param {string} [fullName] user's full name, used to detect transfers between own accounts
 */
export function classify(tx, fullName) {
  const description = normalizeText(tx.description);
  const isCredit = String(tx.type).toUpperCase() === 'CREDIT';

  if (description.includes('maas') || description.includes('salary')) return 'SALARY';
  if (containsAny(description, DEBT_PAYMENT_KEYWORDS)) return 'DEBT_PAYMENT';
  if (description.includes('aidat')) return 'APARTMENT_FEE';
  if (description.includes('kira')) return 'RENT';
  if (description.includes('altin karsiligi')) return 'GIFT';
  if (containsAny(description, SELF_TRANSFER_KEYWORDS)) return 'SELF_TRANSFER';
  if (isCredit && containsAny(description, EMPLOYER_PAYMENT_KEYWORDS)) return 'EXTRA_INCOME';

  const isTransfer = containsAny(description, TRANSFER_KEYWORDS);
  if (isTransfer) {
    if (mentionsName(description, fullName)) return 'SELF_TRANSFER';
    for (const [subCategory, keywords] of NOTED_TRANSFER_RULES) {
      if (containsAny(description, keywords)) return subCategory;
    }
  }
  if (containsAny(description, INCOMING_TRANSFER_KEYWORDS)) return 'MONEY_RECEIVED';
  if (isTransfer) return isCredit ? 'MONEY_RECEIVED' : 'MONEY_SENT';

  for (const [subCategory, keywords] of RULES) {
    if (containsAny(description, keywords)) return subCategory;
  }

  if (isCredit && Number(tx.amount) > 0) return 'EXTRA_INCOME';
  return 'UNKNOWN';
}

/** Returns a copy of the transaction with subCategory and mainCategory filled in. */
export function categorize(tx, fullName) {
  const subCategory = classify(tx, fullName);
  return { ...tx, subCategory, mainCategory: mainCategoryOf(subCategory) };
}
