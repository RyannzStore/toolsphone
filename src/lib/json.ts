// Validator JSON ketat dengan lokasi error (baris/kolom) dan pesan berbahasa Indonesia.
// JSON.parse bawaan memberi pesan berbeda-beda di tiap browser (dan sering tanpa posisi), jadi
// pengecekan dilakukan oleh parser kecil ini; nilai akhirnya tetap diparse dengan JSON.parse.

export type JsonCheck =
  | { ok: true }
  | { ok: false; message: string; position: number; line: number; column: number };

const MAX_DEPTH = 500;

class JsonSyntaxError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

export function validateJson(text: string): JsonCheck {
  try {
    new Checker(text).run();
    return { ok: true };
  } catch (e) {
    if (e instanceof JsonSyntaxError) {
      const { line, column } = lineCol(text, e.pos);
      return { ok: false, message: e.message, position: e.pos, line, column };
    }
    throw e;
  }
}

export function lineCol(text: string, pos: number): { line: number; column: number } {
  const upto = text.slice(0, Math.min(pos, text.length));
  const lines = upto.split(/\r\n|\r|\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

class Checker {
  i = 0;
  s: string;
  constructor(s: string) {
    this.s = s;
  }

  run() {
    this.ws();
    if (this.i >= this.s.length) throw new JsonSyntaxError('JSON kosong — tidak ada nilai.', 0);
    this.value(0);
    this.ws();
    if (this.i < this.s.length) {
      throw new JsonSyntaxError(`Ada teks setelah nilai JSON selesai: ${this.describe()}. Hanya boleh satu nilai di tingkat atas.`, this.i);
    }
  }

  ws() {
    for (;;) {
      const c = this.s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') this.i++;
      else return;
    }
  }

  describe(): string {
    const c = this.s[this.i];
    if (c === undefined) return 'akhir data';
    const word = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
    if (word) return `"${word[0]}"`;
    return `karakter "${c}"`;
  }

  fail(msg: string, pos = this.i): never {
    throw new JsonSyntaxError(msg, pos);
  }

  unexpected(expected: string): never {
    const c = this.s[this.i];
    if (c === undefined) this.fail(`Data berakhir terlalu cepat — diharapkan ${expected}. Cek kurung atau tanda kutip yang belum ditutup.`);
    if (c === "'") this.fail('Gunakan tanda kutip ganda ("), bukan tanda kutip tunggal (\').');
    if (c === '/' && (this.s[this.i + 1] === '/' || this.s[this.i + 1] === '*')) this.fail('Komentar tidak diperbolehkan di JSON.');
    const word = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
    if (word && !['true', 'false', 'null'].includes(word[0])) {
      this.fail(`Nilai ${this.describe()} tidak valid di JSON (diharapkan ${expected}). Teks harus diapit tanda kutip ganda.`);
    }
    this.fail(`Ditemukan ${this.describe()}, diharapkan ${expected}.`);
  }

  value(depth: number) {
    if (depth > MAX_DEPTH) this.fail('Struktur terlalu dalam (lebih dari 500 tingkat).');
    const c = this.s[this.i];
    if (c === '{') return this.object(depth);
    if (c === '[') return this.array(depth);
    if (c === '"') return this.string();
    if (c === '-' || (c !== undefined && c >= '0' && c <= '9')) return this.number();
    if (this.s.startsWith('true', this.i)) return this.literal('true');
    if (this.s.startsWith('false', this.i)) return this.literal('false');
    if (this.s.startsWith('null', this.i)) return this.literal('null');
    this.unexpected('nilai (objek, array, teks, angka, true, false, atau null)');
  }

  literal(word: string) {
    const end = this.i + word.length;
    if (/[\w$]/.test(this.s[end] ?? '')) this.unexpected('akhir nilai');
    this.i = end;
  }

  object(depth: number) {
    this.i++; // {
    this.ws();
    if (this.s[this.i] === '}') {
      this.i++;
      return;
    }
    for (;;) {
      this.ws();
      if (this.s[this.i] !== '"') {
        if (this.s[this.i] === '}') this.fail('Koma berlebih di akhir objek (trailing comma) tidak diperbolehkan di JSON.');
        if (this.s[this.i] === undefined) this.unexpected('nama properti');
        if (this.s[this.i] === "'") this.unexpected('nama properti');
        this.fail(`Nama properti harus berupa teks dengan tanda kutip ganda, ditemukan ${this.describe()}.`);
      }
      this.string();
      this.ws();
      if (this.s[this.i] !== ':') this.unexpected('tanda titik dua ":"');
      this.i++;
      this.ws();
      this.value(depth + 1);
      this.ws();
      const c = this.s[this.i];
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === '}') {
        this.i++;
        return;
      }
      this.unexpected('koma "," atau kurung kurawal tutup "}"');
    }
  }

  array(depth: number) {
    this.i++; // [
    this.ws();
    if (this.s[this.i] === ']') {
      this.i++;
      return;
    }
    for (;;) {
      this.ws();
      if (this.s[this.i] === ']') this.fail('Koma berlebih di akhir array (trailing comma) tidak diperbolehkan di JSON.');
      this.value(depth + 1);
      this.ws();
      const c = this.s[this.i];
      if (c === ',') {
        this.i++;
        continue;
      }
      if (c === ']') {
        this.i++;
        return;
      }
      this.unexpected('koma "," atau kurung siku tutup "]"');
    }
  }

  string() {
    const start = this.i;
    this.i++; // "
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined) this.fail('Teks tidak ditutup — tanda kutip penutup (") tidak ditemukan.', start);
      if (c === '"') {
        this.i++;
        return;
      }
      if (c === '\\') {
        const n = this.s[this.i + 1];
        if (n !== undefined && '"\\/bfnrt'.includes(n)) {
          this.i += 2;
        } else if (n === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(this.s.slice(this.i + 2, this.i + 6))) this.fail('Escape \\u harus diikuti 4 digit heksadesimal.', this.i);
          this.i += 6;
        } else {
          this.fail(`Escape "\\${n ?? ''}" tidak valid di JSON.`, this.i);
        }
        continue;
      }
      if (c < ' ') this.fail('Karakter kontrol (mis. baris baru) di dalam teks harus ditulis sebagai escape (\\n, \\t).');
      this.i++;
    }
  }

  number() {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) {
      const rest = this.s.slice(this.i);
      if (/^-?\d*\./.test(rest)) this.fail('Angka desimal harus punya digit setelah titik.');
      this.fail('Angka tidak valid.');
    }
    const end = this.i + m[0].length;
    if (/^0\d/.test(m[0].replace('-', '')) || /^-?0\d/.test(this.s.slice(this.i, end + 1))) this.fail('Angka tidak boleh diawali nol (mis. 01).');
    const next = this.s[end];
    if (next !== undefined && /[\w.$]/.test(next)) {
      this.i = end;
      if (next === '.') this.fail('Angka desimal harus punya digit setelah titik.');
      this.fail(`Karakter "${next}" tidak diharapkan setelah angka.`);
    }
    this.i = end;
  }
}

export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort((a, b) => a.localeCompare(b))) out[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

export interface JsonFormatResult {
  ok: boolean;
  output: string;
  error?: Extract<JsonCheck, { ok: false }>;
  /** True bila ada angka bulat >15 digit yang mungkin kehilangan presisi saat diparse. */
  precisionWarning: boolean;
}

export function formatJson(text: string, indent: number | '\t', sortKeys = false): JsonFormatResult {
  const check = validateJson(text);
  if (!check.ok) return { ok: false, output: '', error: check, precisionWarning: false };
  let value: unknown = JSON.parse(text);
  if (sortKeys) value = sortKeysDeep(value);
  return { ok: true, output: JSON.stringify(value, null, indent), precisionWarning: hasUnsafeNumber(text) };
}

export function minifyJson(text: string): JsonFormatResult {
  const check = validateJson(text);
  if (!check.ok) return { ok: false, output: '', error: check, precisionWarning: false };
  return { ok: true, output: JSON.stringify(JSON.parse(text)), precisionWarning: hasUnsafeNumber(text) };
}

function hasUnsafeNumber(text: string): boolean {
  // Angka (di luar string) dengan ≥16 digit signifikan
  const stripped = text.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return /(?<![\w.])-?\d{16,}(?![\w])/.test(stripped);
}

export interface JsonStats {
  type: string;
  keys: number;
  depth: number;
  bytes: number;
}

export function jsonStats(text: string): JsonStats {
  const v: unknown = JSON.parse(text);
  let keys = 0;
  const walk = (x: unknown, d: number): number => {
    let max = d;
    if (Array.isArray(x)) for (const y of x) max = Math.max(max, walk(y, d + 1));
    else if (x && typeof x === 'object') {
      for (const [, y] of Object.entries(x)) {
        keys++;
        max = Math.max(max, walk(y, d + 1));
      }
    }
    return max;
  };
  const depth = walk(v, 0);
  const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v;
  return { type, keys, depth, bytes: new TextEncoder().encode(text).length };
}
