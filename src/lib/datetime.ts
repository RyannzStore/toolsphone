// Perhitungan tanggal berbasis kalender (UTC-midnight agar bebas masalah DST).

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number;
}

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function parseYmd(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null; // 31 Feb dst.
  return { y, m: mo, d };
}

export function todayYmd(now = new Date()): YMD {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export function ymdToUtc(a: YMD): number {
  return Date.UTC(a.y, a.m - 1, a.d);
}

export function formatYmd(a: YMD): string {
  return `${a.d} ${MONTH_NAMES[a.m - 1]} ${a.y}`;
}

export function weekdayName(a: YMD): string {
  return DAY_NAMES[new Date(ymdToUtc(a)).getUTCDay()];
}

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function compareYmd(a: YMD, b: YMD): number {
  return ymdToUtc(a) - ymdToUtc(b);
}

/** Selisih hari (b − a), boleh negatif. */
export function daysBetween(a: YMD, b: YMD): number {
  return Math.round((ymdToUtc(b) - ymdToUtc(a)) / 86_400_000);
}

export interface Span {
  years: number;
  months: number;
  days: number;
}

/** Tambah n bulan; hari dipotong ke akhir bulan bila perlu (31 Jan + 1 bulan = 28/29 Feb). */
export function addMonths(a: YMD, n: number): YMD {
  const total = a.y * 12 + (a.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(a.d, daysInMonth(y, m)) };
}

/**
 * Selisih kalender antara dua tanggal (a ≤ b): tahun, bulan, hari.
 * Satu bulan dihitung penuh hanya bila tanggal tujuan ≥ tanggal awal (aturan yang sama dengan
 * java.time.Period.between), sehingga konsisten dengan `nextBirthday` (29 Feb → 1 Mar di tahun non-kabisat).
 */
export function calendarSpan(a: YMD, b: YMD): Span {
  if (compareYmd(a, b) > 0) throw new RangeError('a harus ≤ b');
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  let days = b.d - a.d;
  if (months > 0 && days < 0) {
    months--;
    days = daysBetween(addMonths(a, months), b);
  }
  return { years: Math.floor(months / 12), months: months % 12, days };
}

export function businessDays(a: YMD, b: YMD, includeEnd: boolean): number {
  if (compareYmd(a, b) > 0) [a, b] = [b, a];
  const total = daysBetween(a, b) + (includeEnd ? 1 : 0);
  let count = 0;
  const startDow = new Date(ymdToUtc(a)).getUTCDay();
  for (let i = 0; i < total; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export interface Birthday {
  date: YMD;
  daysLeft: number;
  turning: number;
  weekday: string;
}

/** Ulang tahun berikutnya (hari ini dihitung 0 hari lagi). 29 Feb di tahun non-kabisat dirayakan 1 Maret. */
export function nextBirthday(birth: YMD, today: YMD): Birthday {
  const make = (year: number): YMD => {
    if (birth.m === 2 && birth.d === 29 && !isLeap(year)) return { y: year, m: 3, d: 1 };
    return { y: year, m: birth.m, d: birth.d };
  };
  let date = make(today.y);
  if (compareYmd(date, today) < 0) date = make(today.y + 1);
  return { date, daysLeft: daysBetween(today, date), turning: date.y - birth.y, weekday: weekdayName(date) };
}

/** Tambah hari ke tanggal. */
export function addDays(a: YMD, n: number): YMD {
  const t = new Date(ymdToUtc(a) + n * 86_400_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function splitDuration(totalSeconds: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(totalSeconds));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}
