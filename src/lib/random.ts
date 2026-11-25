// Acak aman secara kriptografi (crypto.getRandomValues) dengan rejection sampling → tanpa modulo bias.

function getCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('Web Crypto tidak tersedia di lingkungan ini');
  return c;
}

/** Bilangan bulat acak seragam di [0, max). max harus 1..2^32. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 4294967296) throw new RangeError('max harus bilangan bulat 1..2^32');
  if (max === 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(4294967296 / max) * max; // kelipatan max terbesar ≤ 2^32
  const c = getCrypto();
  for (;;) {
    c.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Bilangan bulat acak seragam di [min, max] (inklusif), mendukung rentang besar sampai 2^53. */
export function randomRange(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) throw new RangeError('Rentang tidak valid');
  const span = max - min + 1;
  if (span > 2 ** 53) throw new RangeError('Rentang terlalu besar (maks 2^53 nilai)');
  if (span <= 4294967296) return min + randomInt(span);
  // Rentang > 2^32: ambil 53 bit acak dengan rejection sampling
  const c = getCrypto();
  const buf = new Uint32Array(2);
  const limit = Math.floor(2 ** 53 / span) * span;
  for (;;) {
    c.getRandomValues(buf);
    const v = (buf[0] & 0x1fffff) * 4294967296 + buf[1]; // 21 + 32 = 53 bit
    if (v < limit) return min + (v % span);
  }
}

export function pick<T>(arr: readonly T[]): T {
  if (!arr.length) throw new RangeError('Array kosong');
  return arr[randomInt(arr.length)];
}

/** Fisher–Yates dengan sumber acak aman. Tidak mengubah array asli. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomString(length: number, alphabet: string): string {
  const chars = Array.from(alphabet);
  if (!chars.length) throw new RangeError('Alfabet kosong');
  let out = '';
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  /** Karakter tambahan yang dikecualikan */
  exclude?: string;
}

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
  ambiguous: 'Il1O0o|`\'"',
};

export function buildPools(o: PasswordOptions): string[] {
  const ban = new Set(Array.from((o.excludeAmbiguous ? CHARSETS.ambiguous : '') + (o.exclude ?? '')));
  const filter = (s: string) => Array.from(s).filter((c) => !ban.has(c)).join('');
  const pools: string[] = [];
  if (o.lower) pools.push(filter(CHARSETS.lower));
  if (o.upper) pools.push(filter(CHARSETS.upper));
  if (o.digits) pools.push(filter(CHARSETS.digits));
  if (o.symbols) pools.push(filter(CHARSETS.symbols));
  return pools.filter((p) => p.length > 0);
}

/** Password acak; menjamin minimal satu karakter dari tiap jenis yang dipilih. */
export function generatePassword(o: PasswordOptions): string {
  const pools = buildPools(o);
  if (!pools.length) throw new Error('Pilih minimal satu jenis karakter');
  if (o.length < pools.length) throw new Error(`Panjang minimal ${pools.length} untuk pilihan ini`);
  const all = pools.join('');
  const chars: string[] = pools.map((p) => pick(Array.from(p)));
  while (chars.length < o.length) chars.push(pick(Array.from(all)));
  return shuffle(chars).join('');
}

/** Perkiraan entropi (bit) = panjang × log2(ukuran alfabet efektif). */
export function entropyBits(length: number, poolSize: number): number {
  if (poolSize < 2 || length < 1) return 0;
  return length * Math.log2(poolSize);
}

export function strengthLabel(bits: number): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
  if (bits < 36) return { label: 'Sangat lemah', level: 0 };
  if (bits < 60) return { label: 'Lemah', level: 1 };
  if (bits < 80) return { label: 'Cukup', level: 2 };
  if (bits < 110) return { label: 'Kuat', level: 3 };
  return { label: 'Sangat kuat', level: 4 };
}

export function uuidv4(): string {
  const c = getCrypto();
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
