// Rumus bangun datar (luas & keliling) dan bangun ruang (volume & luas permukaan).

export interface Field {
  key: string;
  label: string;
}

export interface ShapeResult {
  label: string;
  value: number;
  unit: 'linear' | 'area' | 'volume';
}

export interface Shape {
  id: string;
  label: string;
  fields: Field[];
  compute: (v: Record<string, number>) => ShapeResult[];
  formula: string;
}

const L = (label: string, value: number): ShapeResult => ({ label, value, unit: 'linear' });
const A = (label: string, value: number): ShapeResult => ({ label, value, unit: 'area' });
const V = (label: string, value: number): ShapeResult => ({ label, value, unit: 'volume' });

export const AREA_SHAPES: Shape[] = [
  {
    id: 'square', label: 'Persegi', fields: [{ key: 's', label: 'Sisi (s)' }],
    formula: 'L = s², K = 4s',
    compute: (v) => [A('Luas', v.s ** 2), L('Keliling', 4 * v.s)],
  },
  {
    id: 'rectangle', label: 'Persegi panjang', fields: [{ key: 'p', label: 'Panjang (p)' }, { key: 'l', label: 'Lebar (l)' }],
    formula: 'L = p × l, K = 2(p + l)',
    compute: (v) => [A('Luas', v.p * v.l), L('Keliling', 2 * (v.p + v.l))],
  },
  {
    id: 'triangle', label: 'Segitiga', fields: [{ key: 'a', label: 'Alas (a)' }, { key: 't', label: 'Tinggi (t)' }],
    formula: 'L = ½ × a × t',
    compute: (v) => [A('Luas', 0.5 * v.a * v.t)],
  },
  {
    id: 'triangle3', label: 'Segitiga (3 sisi)', fields: [{ key: 'a', label: 'Sisi a' }, { key: 'b', label: 'Sisi b' }, { key: 'c', label: 'Sisi c' }],
    formula: 'Rumus Heron: L = √(s(s−a)(s−b)(s−c)), s = K/2',
    compute: (v) => {
      const { a, b, c } = v;
      if (a + b <= c || a + c <= b || b + c <= a) throw new Error('Ketiga sisi tidak membentuk segitiga (jumlah dua sisi harus lebih besar dari sisi ketiga).');
      const s = (a + b + c) / 2;
      return [A('Luas', Math.sqrt(s * (s - a) * (s - b) * (s - c))), L('Keliling', a + b + c)];
    },
  },
  {
    id: 'circle', label: 'Lingkaran', fields: [{ key: 'r', label: 'Jari-jari (r)' }],
    formula: 'L = πr², K = 2πr',
    compute: (v) => [A('Luas', Math.PI * v.r ** 2), L('Keliling', 2 * Math.PI * v.r)],
  },
  {
    id: 'parallelogram', label: 'Jajar genjang', fields: [{ key: 'a', label: 'Alas (a)' }, { key: 't', label: 'Tinggi (t)' }, { key: 's', label: 'Sisi miring (s)' }],
    formula: 'L = a × t, K = 2(a + s)',
    compute: (v) => [A('Luas', v.a * v.t), L('Keliling', 2 * (v.a + v.s))],
  },
  {
    id: 'trapezoid', label: 'Trapesium', fields: [{ key: 'a', label: 'Sisi sejajar a' }, { key: 'b', label: 'Sisi sejajar b' }, { key: 't', label: 'Tinggi (t)' }],
    formula: 'L = ½ × (a + b) × t',
    compute: (v) => [A('Luas', 0.5 * (v.a + v.b) * v.t)],
  },
  {
    id: 'rhombus', label: 'Belah ketupat / layang-layang', fields: [{ key: 'd1', label: 'Diagonal 1' }, { key: 'd2', label: 'Diagonal 2' }],
    formula: 'L = ½ × d₁ × d₂',
    compute: (v) => [A('Luas', 0.5 * v.d1 * v.d2)],
  },
  {
    id: 'ellipse', label: 'Elips', fields: [{ key: 'a', label: 'Setengah sumbu panjang (a)' }, { key: 'b', label: 'Setengah sumbu pendek (b)' }],
    formula: 'L = πab, K ≈ π[3(a+b) − √((3a+b)(a+3b))] (Ramanujan)',
    compute: (v) => [A('Luas', Math.PI * v.a * v.b), L('Keliling (perkiraan)', Math.PI * (3 * (v.a + v.b) - Math.sqrt((3 * v.a + v.b) * (v.a + 3 * v.b))))],
  },
];

export const VOLUME_SHAPES: Shape[] = [
  {
    id: 'cube', label: 'Kubus', fields: [{ key: 's', label: 'Rusuk (s)' }],
    formula: 'V = s³, LP = 6s²',
    compute: (v) => [V('Volume', v.s ** 3), A('Luas permukaan', 6 * v.s ** 2)],
  },
  {
    id: 'cuboid', label: 'Balok', fields: [{ key: 'p', label: 'Panjang (p)' }, { key: 'l', label: 'Lebar (l)' }, { key: 't', label: 'Tinggi (t)' }],
    formula: 'V = p × l × t, LP = 2(pl + pt + lt)',
    compute: (v) => [V('Volume', v.p * v.l * v.t), A('Luas permukaan', 2 * (v.p * v.l + v.p * v.t + v.l * v.t))],
  },
  {
    id: 'cylinder', label: 'Tabung', fields: [{ key: 'r', label: 'Jari-jari (r)' }, { key: 't', label: 'Tinggi (t)' }],
    formula: 'V = πr²t, LP = 2πr(r + t)',
    compute: (v) => [V('Volume', Math.PI * v.r ** 2 * v.t), A('Luas permukaan', 2 * Math.PI * v.r * (v.r + v.t))],
  },
  {
    id: 'cone', label: 'Kerucut', fields: [{ key: 'r', label: 'Jari-jari (r)' }, { key: 't', label: 'Tinggi (t)' }],
    formula: 'V = ⅓πr²t, LP = πr(r + s), s = √(r² + t²)',
    compute: (v) => {
      const s = Math.sqrt(v.r ** 2 + v.t ** 2);
      return [V('Volume', (Math.PI * v.r ** 2 * v.t) / 3), A('Luas permukaan', Math.PI * v.r * (v.r + s)), L('Garis pelukis (s)', s)];
    },
  },
  {
    id: 'sphere', label: 'Bola', fields: [{ key: 'r', label: 'Jari-jari (r)' }],
    formula: 'V = ⁴⁄₃πr³, LP = 4πr²',
    compute: (v) => [V('Volume', (4 / 3) * Math.PI * v.r ** 3), A('Luas permukaan', 4 * Math.PI * v.r ** 2)],
  },
  {
    id: 'square-pyramid', label: 'Limas segi empat', fields: [{ key: 's', label: 'Sisi alas (s)' }, { key: 't', label: 'Tinggi limas (t)' }],
    formula: 'V = ⅓s²t, LP = s² + 2s√(t² + (s/2)²)',
    compute: (v) => {
      const slant = Math.sqrt(v.t ** 2 + (v.s / 2) ** 2);
      return [V('Volume', (v.s ** 2 * v.t) / 3), A('Luas permukaan', v.s ** 2 + 2 * v.s * slant)];
    },
  },
  {
    id: 'triangular-prism', label: 'Prisma segitiga', fields: [{ key: 'a', label: 'Alas segitiga (a)' }, { key: 'h', label: 'Tinggi segitiga (h)' }, { key: 't', label: 'Tinggi prisma (t)' }],
    formula: 'V = ½ × a × h × t',
    compute: (v) => [V('Volume', 0.5 * v.a * v.h * v.t)],
  },
];

export function runShape(shape: Shape, raw: Record<string, string>): { ok: true; results: ShapeResult[] } | { ok: false; error: string } {
  const values: Record<string, number> = {};
  for (const f of shape.fields) {
    const txt = (raw[f.key] ?? '').trim().replace(',', '.');
    if (txt === '') return { ok: false, error: '' };
    const n = Number(txt);
    if (!Number.isFinite(n)) return { ok: false, error: `${f.label}: bukan angka yang valid.` };
    if (n < 0) return { ok: false, error: `${f.label}: tidak boleh negatif.` };
    values[f.key] = n;
  }
  try {
    return { ok: true, results: shape.compute(values) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghitung.' };
  }
}
