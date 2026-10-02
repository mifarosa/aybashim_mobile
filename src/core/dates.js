// Dates are stored as ISO "YYYY-MM-DD" strings so that they sort and compare lexically.

const pad = (value) => String(value).padStart(2, '0');

export function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

/** Parses "dd.MM.yyyy" or "dd/MM/yyyy" into an ISO date; returns null when invalid. */
export function parseDayMonthYear(text) {
  const match = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(String(text || '').trim());
  if (!match) return null;
  return toIsoDate(match[3], match[2], match[1]);
}

const EXCEL_EPOCH_1900 = Date.UTC(1899, 11, 30);
const EXCEL_EPOCH_1904 = Date.UTC(1904, 0, 1);
const DAY_MS = 86400000;

/** Converts an Excel serial date number into an ISO date, ignoring the time part. */
export function excelSerialToIsoDate(serial, date1904 = false) {
  if (typeof serial !== 'number' || !Number.isFinite(serial) || serial < 1) return null;
  const epoch = date1904 ? EXCEL_EPOCH_1904 : EXCEL_EPOCH_1900;
  const date = new Date(epoch + Math.floor(serial) * DAY_MS);
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function monthKey(isoDate) {
  return isoDate ? isoDate.slice(0, 7) : '';
}

/** First and last ISO day of a "YYYY-MM" month. */
export function monthRange(key) {
  const [year, month] = String(key).split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: toIsoDate(year, month, 1), end: toIsoDate(year, month, lastDay) };
}

export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function formatMonth(key, { short = false } = {}) {
  const [year, month] = String(key || '').split('-');
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name) return key || '';
  return short ? `${name.slice(0, 3)} ${year.slice(2)}` : `${name} ${year}`;
}

export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  if (!day) return isoDate || '';
  return `${day}.${month}.${year}`;
}
