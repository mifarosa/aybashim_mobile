// Category model ported from the backend enums (MainCategory / SubCategory).

export const MAIN_CATEGORIES = {
  INCOME: 'Gelir',
  HOUSING: 'Konut',
  BILLS: 'Fatura',
  FOOD: 'Yemek',
  SHOPPING: 'Alışveriş',
  TRANSPORTATION: 'Ulaşım',
  HEALTH: 'Sağlık',
  EDUCATION: 'Eğitim',
  SUBSCRIPTION: 'Abonelik',
  INVESTMENT: 'Yatırım',
  TRANSFER: 'Transfer',
  CASH: 'Nakit',
  BANK_FEES: 'Banka kesintisi',
  OTHER: 'Diğer'
};

export const SUB_CATEGORIES = {
  SALARY: { label: 'Maaş', main: 'INCOME' },
  EXTRA_INCOME: { label: 'Ek Gelir', main: 'INCOME' },

  RENT: { label: 'Kira', main: 'HOUSING' },
  APARTMENT_FEE: { label: 'Aidat', main: 'HOUSING' },
  HOME_GOODS: { label: 'Ev Eşyası', main: 'HOUSING' },

  INTERNET: { label: 'İnternet', main: 'BILLS' },
  MOBILE_PHONE: { label: 'Mobil Hat', main: 'BILLS' },
  ELECTRICITY: { label: 'Elektrik', main: 'BILLS' },
  WATER: { label: 'Su', main: 'BILLS' },
  NATURAL_GAS: { label: 'Doğalgaz', main: 'BILLS' },

  MARKET: { label: 'Market', main: 'FOOD' },
  RESTAURANT: { label: 'Restoran', main: 'FOOD' },
  COFFEE: { label: 'Kafe', main: 'FOOD' },

  E_COMMERCE: { label: 'E-Ticaret', main: 'SHOPPING' },
  GENERAL_SHOPPING: { label: 'Genel Alışveriş', main: 'SHOPPING' },
  CLOTHING: { label: 'Giyim', main: 'SHOPPING' },
  ELECTRONICS: { label: 'Elektronik', main: 'SHOPPING' },

  PUBLIC_TRANSPORT: { label: 'Toplu Taşıma', main: 'TRANSPORTATION' },
  TAXI: { label: 'Taksi', main: 'TRANSPORTATION' },
  FUEL: { label: 'Yakıt', main: 'TRANSPORTATION' },
  FLIGHT: { label: 'Uçak', main: 'TRANSPORTATION' },
  TRAVEL: { label: 'Seyahat', main: 'TRANSPORTATION' },

  PHARMACY: { label: 'Eczane', main: 'HEALTH' },
  HOSPITAL: { label: 'Hastane', main: 'HEALTH' },
  SPORTS_FITNESS: { label: 'Spor/Fitness', main: 'HEALTH' },

  ONLINE_COURSE: { label: 'Online Kurs', main: 'EDUCATION' },
  BOOK: { label: 'Kitap', main: 'EDUCATION' },
  EXAM_FEE: { label: 'Sınav Ücreti', main: 'EDUCATION' },

  DIGITAL_SUBSCRIPTION: { label: 'Dijital Abonelik', main: 'SUBSCRIPTION' },

  GOLD: { label: 'Altın', main: 'INVESTMENT' },
  SILVER: { label: 'Gümüş', main: 'INVESTMENT' },
  FOREIGN_CURRENCY: { label: 'Döviz', main: 'INVESTMENT' },
  STOCK_FUND: { label: 'Hisse/Fon', main: 'INVESTMENT' },

  MONEY_SENT: { label: 'Gönderilen Para', main: 'TRANSFER' },
  MONEY_RECEIVED: { label: 'Gelen Para', main: 'TRANSFER' },
  DEBT_PAYMENT: { label: 'Borç Ödeme', main: 'TRANSFER' },
  SELF_TRANSFER: { label: 'Kendime Transfer', main: 'TRANSFER' },

  ATM_WITHDRAWAL: { label: 'ATM Para Çekme', main: 'CASH' },
  ATM_DEPOSIT: { label: 'ATM Para Yatırma', main: 'CASH' },

  BANK_FEE: { label: 'Banka Kesintisi', main: 'BANK_FEES' },

  PET_CARE: { label: 'Evcil Hayvan', main: 'OTHER' },
  GIFT: { label: 'Hediye', main: 'OTHER' },
  UNKNOWN: { label: 'Bilinmeyen', main: 'OTHER' }
};

// Badge abbreviation and color per category, ported from the web dashboard.
const BADGES = {
  SALARY: ['GL', '#83d39a'],
  EXTRA_INCOME: ['EK', '#83d39a'],
  RENT: ['EV', '#b7a7f1'],
  APARTMENT_FEE: ['EV', '#b7a7f1'],
  HOME_GOODS: ['ES', '#c5a3ef'],
  INTERNET: ['FT', '#8fb4f5'],
  MOBILE_PHONE: ['FT', '#8fb4f5'],
  ELECTRICITY: ['FT', '#8fb4f5'],
  WATER: ['FT', '#8fb4f5'],
  NATURAL_GAS: ['FT', '#8fb4f5'],
  MARKET: ['MR', '#72c6b4'],
  RESTAURANT: ['YM', '#f2a477'],
  COFFEE: ['KF', '#f3c86f'],
  E_COMMERCE: ['AL', '#c5a3ef'],
  GENERAL_SHOPPING: ['AL', '#c5a3ef'],
  CLOTHING: ['GY', '#c5a3ef'],
  ELECTRONICS: ['EL', '#c5a3ef'],
  PUBLIC_TRANSPORT: ['UL', '#8fb4f5'],
  TAXI: ['TX', '#8fb4f5'],
  FUEL: ['YT', '#8fb4f5'],
  FLIGHT: ['SY', '#8fb4f5'],
  TRAVEL: ['SY', '#8fb4f5'],
  PHARMACY: ['SG', '#ee8fa2'],
  HOSPITAL: ['SG', '#ee8fa2'],
  SPORTS_FITNESS: ['SP', '#a6c873'],
  ONLINE_COURSE: ['EG', '#f3c86f'],
  BOOK: ['KT', '#f3c86f'],
  EXAM_FEE: ['EG', '#f3c86f'],
  DIGITAL_SUBSCRIPTION: ['AB', '#b7a7f1'],
  GOLD: ['YA', '#f3c86f'],
  SILVER: ['GM', '#9fb0bf'],
  FOREIGN_CURRENCY: ['DV', '#9fb0bf'],
  STOCK_FUND: ['FN', '#9fb0bf'],
  MONEY_SENT: ['TR', '#9fb0bf'],
  MONEY_RECEIVED: ['TR', '#83d39a'],
  DEBT_PAYMENT: ['OD', '#9fb0bf'],
  SELF_TRANSFER: ['KT', '#9fb0bf'],
  ATM_WITHDRAWAL: ['NK', '#f2a477'],
  ATM_DEPOSIT: ['NK', '#83d39a'],
  BANK_FEE: ['BK', '#ee8fa2'],
  PET_CARE: ['PC', '#a6c873'],
  GIFT: ['HD', '#ee8fa2'],
  UNKNOWN: ['??', '#9fb0bf'],
  INCOME: ['GL', '#83d39a'],
  HOUSING: ['EV', '#b7a7f1'],
  BILLS: ['FT', '#8fb4f5'],
  FOOD: ['YM', '#f2a477'],
  SHOPPING: ['AL', '#c5a3ef'],
  TRANSPORTATION: ['UL', '#8fb4f5'],
  HEALTH: ['SG', '#ee8fa2'],
  EDUCATION: ['EG', '#f3c86f'],
  SUBSCRIPTION: ['AB', '#b7a7f1'],
  INVESTMENT: ['YT', '#9fb0bf'],
  TRANSFER: ['TR', '#9fb0bf'],
  CASH: ['NK', '#f2a477'],
  BANK_FEES: ['BK', '#ee8fa2'],
  OTHER: ['DG', '#9fb0bf']
};

export const CHART_COLORS = [
  '#72c6b4',
  '#f2a477',
  '#8fb4f5',
  '#c5a3ef',
  '#f3c86f',
  '#83d39a',
  '#ee8fa2',
  '#a6c873',
  '#b7a7f1',
  '#9fb0bf'
];

export function mainCategoryOf(subCategory) {
  return (SUB_CATEGORIES[subCategory] || SUB_CATEGORIES.UNKNOWN).main;
}

export function categoryLabel(code) {
  if (!code) return 'Bilinmeyen';
  if (SUB_CATEGORIES[code]) return SUB_CATEGORIES[code].label;
  if (MAIN_CATEGORIES[code]) return MAIN_CATEGORIES[code];
  return code;
}

export function categoryBadge(code) {
  const [short, color] = BADGES[String(code || 'UNKNOWN').toUpperCase()] || BADGES.UNKNOWN;
  return { short, color };
}
