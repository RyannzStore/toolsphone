// Evaluator ekspresi matematika yang aman (tanpa eval / Function).
// Mendukung: + - * / ^ ! % (persen / modulo), kurung, konstanta, dan fungsi ilmiah.

export class MathError extends Error {}

export type AngleMode = 'deg' | 'rad';

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

const SINGLE_ARG = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'log', 'ln', 'log2', 'sqrt', 'cbrt', 'abs', 'exp', 'floor', 'ceil', 'round', 'fact', 'sign',
]);

function tokenize(src: string): Token[] {
  const s = src
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt');
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const ch = s[j];
      if (ch === 'e' || ch === 'E') {
        const n1 = s[j + 1] ?? '';
        const n2 = s[j + 2] ?? '';
        if (/[0-9]/.test(n1) || (/[+-]/.test(n1) && /[0-9]/.test(n2))) {
          j++;
          if (/[+-]/.test(s[j])) j++;
          while (j < s.length && /[0-9]/.test(s[j])) j++;
        }
      }
      const raw = s.slice(i, j);
      const v = Number(raw);
      if (!Number.isFinite(v) || raw.split('.').length > 2) throw new MathError('Angka tidak valid: ' + raw);
      out.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z_]/.test(s[j])) j++;
      let id = s.slice(i, j).toLowerCase();
      if (id === 'log' && s[j] === '2' && s[j + 1] === '(') {
        id = 'log2';
        j++;
      }
      out.push({ t: 'id', v: id });
      i = j;
      continue;
    }
    if ('+-*/^%!(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new MathError('Karakter tidak dikenal: ' + c);
  }
  return out;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new MathError('Faktorial hanya untuk bilangan bulat 0–170');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

class Parser {
  i = 0;
  tk: Token[];
  angle: AngleMode;

  constructor(tk: Token[], angle: AngleMode) {
    this.tk = tk;
    this.angle = angle;
  }

  isOp(v: string): boolean {
    const t = this.tk[this.i];
    return t !== undefined && t.t === 'op' && t.v === v;
  }

  startsFactor(): boolean {
    const t = this.tk[this.i];
    if (!t) return false;
    return t.t === 'num' || t.t === 'id' || (t.t === 'op' && t.v === '(');
  }

  parse(): number {
    const v = this.expr();
    if (this.i < this.tk.length) throw new MathError('Ekspresi tidak lengkap atau ada simbol berlebih');
    return v;
  }

  expr(): number {
    let v = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.tk[this.i++] as { v: string }).v;
      const r = this.term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  term(): number {
    let v = this.unary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = (this.tk[this.i++] as { v: string }).v;
        const r = this.unary();
        if (op === '/') {
          if (r === 0) throw new MathError('Pembagian dengan nol');
          v = v / r;
        } else {
          v = v * r;
        }
      } else if (this.isOp('%')) {
        // sampai di sini berarti modulo (setelah % ada operand)
        this.i++;
        const r = this.unary();
        if (r === 0) throw new MathError('Modulo dengan nol');
        v = v % r;
      } else if (this.startsFactor()) {
        v = v * this.power(); // perkalian implisit: 2π, 3(4+1)
      } else {
        break;
      }
    }
    return v;
  }

  unary(): number {
    if (this.isOp('-')) {
      this.i++;
      return -this.unary();
    }
    if (this.isOp('+')) {
      this.i++;
      return this.unary();
    }
    return this.power();
  }

  power(): number {
    const base = this.postfix();
    if (this.isOp('^')) {
      this.i++;
      const exp = this.unary();
      return Math.pow(base, exp);
    }
    return base;
  }

  postfix(): number {
    let v = this.primary();
    for (;;) {
      if (this.isOp('!')) {
        this.i++;
        v = factorial(v);
      } else if (this.isOp('%')) {
        const n = this.tk[this.i + 1];
        if (n && (n.t === 'num' || n.t === 'id' || (n.t === 'op' && n.v === '('))) break; // modulo
        this.i++;
        v = v / 100;
      } else {
        break;
      }
    }
    return v;
  }

  primary(): number {
    const t = this.tk[this.i];
    if (!t) throw new MathError('Ekspresi belum lengkap');
    if (t.t === 'num') {
      this.i++;
      return t.v;
    }
    if (t.t === 'op' && t.v === '(') {
      this.i++;
      const v = this.expr();
      if (!this.isOp(')')) throw new MathError('Kurung tutup ")" kurang');
      this.i++;
      return v;
    }
    if (t.t === 'id') {
      this.i++;
      if (this.isOp('(')) {
        this.i++;
        const args: number[] = [];
        if (!this.isOp(')')) {
          for (;;) {
            args.push(this.expr());
            if (this.isOp(',')) {
              this.i++;
              continue;
            }
            break;
          }
        }
        if (!this.isOp(')')) throw new MathError('Kurung tutup ")" kurang');
        this.i++;
        return this.call(t.v, args);
      }
      if (CONSTANTS[t.v] !== undefined) return CONSTANTS[t.v];
      if (SINGLE_ARG.has(t.v)) {
        const a = this.unary();
        return this.call(t.v, [a]);
      }
      throw new MathError('Fungsi / konstanta tidak dikenal: ' + t.v);
    }
    throw new MathError('Simbol tidak terduga: ' + t.v);
  }

  toRad(x: number): number {
    return this.angle === 'deg' ? (x * Math.PI) / 180 : x;
  }

  fromRad(x: number): number {
    return this.angle === 'deg' ? (x * 180) / Math.PI : x;
  }

  call(name: string, a: number[]): number {
    const need = (n: number) => {
      if (a.length !== n) throw new MathError(`${name}() membutuhkan ${n} argumen`);
    };
    switch (name) {
      case 'sin': need(1); return Math.sin(this.toRad(a[0]));
      case 'cos': need(1); return Math.cos(this.toRad(a[0]));
      case 'tan': {
        need(1);
        if (this.angle === 'deg' && Math.abs((((a[0] - 90) % 180) + 180) % 180) < 1e-9) {
          throw new MathError('tan tidak terdefinisi pada sudut ini');
        }
        return Math.tan(this.toRad(a[0]));
      }
      case 'asin': need(1); return this.fromRad(Math.asin(a[0]));
      case 'acos': need(1); return this.fromRad(Math.acos(a[0]));
      case 'atan': need(1); return this.fromRad(Math.atan(a[0]));
      case 'sinh': need(1); return Math.sinh(a[0]);
      case 'cosh': need(1); return Math.cosh(a[0]);
      case 'tanh': need(1); return Math.tanh(a[0]);
      case 'log': {
        need(1);
        if (a[0] <= 0) throw new MathError('log hanya untuk bilangan positif');
        return Math.log10(a[0]);
      }
      case 'ln': {
        need(1);
        if (a[0] <= 0) throw new MathError('ln hanya untuk bilangan positif');
        return Math.log(a[0]);
      }
      case 'log2': {
        need(1);
        if (a[0] <= 0) throw new MathError('log2 hanya untuk bilangan positif');
        return Math.log2(a[0]);
      }
      case 'sqrt': {
        need(1);
        if (a[0] < 0) throw new MathError('Akar bilangan negatif tidak terdefinisi');
        return Math.sqrt(a[0]);
      }
      case 'cbrt': need(1); return Math.cbrt(a[0]);
      case 'abs': need(1); return Math.abs(a[0]);
      case 'exp': need(1); return Math.exp(a[0]);
      case 'floor': need(1); return Math.floor(a[0]);
      case 'ceil': need(1); return Math.ceil(a[0]);
      case 'round': need(1); return Math.round(a[0]);
      case 'sign': need(1); return Math.sign(a[0]);
      case 'fact': need(1); return factorial(a[0]);
      case 'pow': need(2); return Math.pow(a[0], a[1]);
      case 'mod': {
        need(2);
        if (a[1] === 0) throw new MathError('Modulo dengan nol');
        return a[0] % a[1];
      }
      case 'min': if (!a.length) throw new MathError('min() butuh argumen'); return Math.min(...a);
      case 'max': if (!a.length) throw new MathError('max() butuh argumen'); return Math.max(...a);
      default:
        throw new MathError('Fungsi tidak dikenal: ' + name);
    }
  }
}

function clean(x: number): number {
  if (Math.abs(x) < 1e-12) return 0;
  return parseFloat(x.toPrecision(12));
}

export function evaluate(expr: string, angle: AngleMode = 'rad'): number {
  const tokens = tokenize(expr);
  if (!tokens.length) throw new MathError('Ekspresi kosong');
  const v = new Parser(tokens, angle).parse();
  if (Number.isNaN(v)) throw new MathError('Hasil tidak terdefinisi');
  if (!Number.isFinite(v)) throw new MathError('Hasil terlalu besar / tak terhingga');
  return clean(v);
}

export function formatResult(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-9) {
    return n.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }
  return String(parseFloat(n.toPrecision(12)));
}
