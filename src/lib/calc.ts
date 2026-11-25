// Logika kalkulator murni: pecahan (BigInt), rasio, statistik.

// ───────────────────────────── Pecahan

export interface Fraction {
  n: bigint;
  d: bigint;
}

export function gcdBig(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function simplify(f: Fraction): Fraction {
  if (f.d === 0n) throw new Error('Penyebut tidak boleh nol');
  let { n, d } = f;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcdBig(n, d) || 1n;
  return { n: n / g, d: d / g };
}

/** Terima "3/4", "-2/6", "1 1/2" (campuran), "5", dan desimal "0.75" / "0,75". */
export function parseFraction(input: string): Fraction | null {
  const s = input.trim().replace(',', '.');
  if (!s) return null;
  let m = /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s); // campuran
  if (m) {
    const whole = BigInt(m[2]);
    const num = BigInt(m[3]);
    const den = BigInt(m[4]);
    if (den === 0n) return null;
    const total = whole * den + num;
    return simplify({ n: m[1] ? -total : total, d: den });
  }
  m = /^(-?\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) {
    const den = BigInt(m[2]);
    if (den === 0n) return null;
    return simplify({ n: BigInt(m[1]), d: den });
  }
  m = /^(-?)(\d*)\.(\d+)$/.exec(s) ?? /^(-?)(\d+)()$/.exec(s);
  if (m) {
    const frac = m[3] ?? '';
    const digits = BigInt((m[2] || '0') + frac);
    return simplify({ n: m[1] ? -digits : digits, d: 10n ** BigInt(frac.length) });
  }
  return null;
}

export function fracOp(a: Fraction, b: Fraction, op: '+' | '-' | '×' | '÷'): Fraction {
  switch (op) {
    case '+': return simplify({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
    case '-': return simplify({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
    case '×': return simplify({ n: a.n * b.n, d: a.d * b.d });
    case '÷':
      if (b.n === 0n) throw new Error('Tidak bisa membagi dengan nol');
      return simplify({ n: a.n * b.d, d: a.d * b.n });
  }
}

export function fracToString(f: Fraction): string {
  return f.d === 1n ? f.n.toString() : `${f.n}/${f.d}`;
}

export function fracToMixed(f: Fraction): string {
  if (f.d === 1n) return f.n.toString();
  const neg = f.n < 0n;
  const abs = neg ? -f.n : f.n;
  const whole = abs / f.d;
  const rem = abs % f.d;
  const sign = neg ? '-' : '';
  if (whole === 0n) return `${sign}${rem}/${f.d}`;
  return `${sign}${whole} ${rem}/${f.d}`;
}

export function fracToDecimal(f: Fraction, digits = 10): string {
  const neg = f.n < 0n;
  const abs = neg ? -f.n : f.n;
  const whole = abs / f.d;
  let rem = abs % f.d;
  let out = whole.toString();
  if (rem === 0n) return (neg ? '-' : '') + out;
  out += '.';
  let i = 0;
  while (rem !== 0n && i < digits) {
    rem *= 10n;
    out += (rem / f.d).toString();
    rem %= f.d;
    i++;
  }
  out = out.replace(/0+$/, '');
  return (neg ? '-' : '') + out + (rem !== 0n ? '…' : '');
}

// ───────────────────────────── Rasio

export function simplifyRatio(values: number[]): number[] | null {
  if (values.length < 2 || values.some((v) => !Number.isFinite(v) || v < 0)) return null;
  // Ubah desimal ke bilangan bulat dengan menggeser koma
  let scale = 1;
  for (const v of values) {
    const s = String(v);
    const dec = s.includes('.') ? s.split('.')[1].length : 0;
    scale = Math.max(scale, 10 ** Math.min(dec, 9));
  }
  const ints = values.map((v) => Math.round(v * scale));
  if (ints.every((v) => v === 0)) return null;
  const g = ints.reduce((a, b) => gcd(a, b));
  return ints.map((v) => v / (g || 1));
}

/** a : b = c : x → x = b·c / a */
export function solveProportion(a: number, b: number, c: number): number | null {
  if (a === 0) return null;
  return (b * c) / a;
}

// ───────────────────────────── Statistik

export interface Stats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  modes: number[];
  modeCount: number;
  min: number;
  max: number;
  range: number;
  variancePop: number;
  varianceSample: number | null;
  stdPop: number;
  stdSample: number | null;
  sorted: number[];
}

export function computeStats(nums: number[]): Stats | null {
  if (!nums.length) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const count = nums.length;
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const freq = new Map<number, number>();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);
  const modeCount = Math.max(...freq.values());
  const modes = modeCount > 1 ? [...freq.entries()].filter(([, c]) => c === modeCount).map(([v]) => v).sort((a, b) => a - b) : [];
  const ss = nums.reduce((a, b) => a + (b - mean) ** 2, 0);
  const variancePop = ss / count;
  const varianceSample = count > 1 ? ss / (count - 1) : null;
  return {
    count,
    sum,
    mean,
    median,
    modes,
    modeCount,
    min: sorted[0],
    max: sorted[count - 1],
    range: sorted[count - 1] - sorted[0],
    variancePop,
    varianceSample,
    stdPop: Math.sqrt(variancePop),
    stdSample: varianceSample === null ? null : Math.sqrt(varianceSample),
    sorted,
  };
}

/**
 * Ambil angka dari teks. Pemisah: spasi / baris baru / titik koma (koma di dalam token = desimal).
 * Jika teks hanya satu baris tanpa spasi/titik koma, koma dianggap pemisah.
 */
export function parseNumberList(text: string): { numbers: number[]; invalid: string[] } {
  const t = text.trim();
  if (!t) return { numbers: [], invalid: [] };
  const tokens = /[\s;]/.test(t) ? t.split(/[\s;]+/) : t.split(',');
  const numbers: number[] = [];
  const invalid: string[] = [];
  for (const raw of tokens) {
    const tok = raw.trim();
    if (!tok) continue;
    const norm = /[\s;]/.test(t) ? tok.replace(',', '.') : tok;
    const n = Number(norm);
    if (Number.isFinite(n) && /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(norm)) numbers.push(n);
    else invalid.push(tok);
  }
  return { numbers, invalid };
}
