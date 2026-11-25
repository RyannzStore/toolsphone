'use client';

import { useCallback, useMemo, useState, type ComponentType, type KeyboardEvent } from 'react';
import { Delete, History } from 'lucide-react';
import { evaluate, formatResult, MathError, type AngleMode } from '@/lib/math';
import { computeStats, fracOp, fracToDecimal, fracToMixed, fracToString, parseFraction, parseNumberList, simplify, simplifyRatio, solveProportion, type Fraction } from '@/lib/calc';
import { AREA_SHAPES, VOLUME_SHAPES, runShape, type Shape } from '@/lib/geometry';
import { applyDiscount, percentChange, profitLoss, sellFromMargin, sellFromMarkup } from '@/lib/finance';
import {
  Actions, Card, CopyButton, KeyValue, Notice, NumField, Row, Segmented, SelectField, Stat, StatGrid, TextAreaField,
  TextField, fmtNum, parseNum, useStored,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

// ─────────────────────────── Kalkulator (basic + scientific)

interface Key {
  label: string;
  insert?: string;
  aria?: string;
  kind?: 'op' | 'fn' | 'num' | 'eq' | 'util';
  action?: 'clear' | 'back' | 'equals';
}

const BASIC_KEYS: Key[] = [
  { label: 'C', action: 'clear', kind: 'util', aria: 'Hapus semua' },
  { label: '(', insert: '(', kind: 'util' },
  { label: ')', insert: ')', kind: 'util' },
  { label: '÷', insert: '÷', kind: 'op', aria: 'Bagi' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' },
  { label: '×', insert: '×', kind: 'op', aria: 'Kali' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' },
  { label: '−', insert: '−', kind: 'op', aria: 'Kurang' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' },
  { label: '+', insert: '+', kind: 'op', aria: 'Tambah' },
  { label: '0', insert: '0' }, { label: '.', insert: '.', aria: 'Titik desimal' },
  { label: '%', insert: '%', kind: 'util', aria: 'Persen' },
  { label: '=', action: 'equals', kind: 'eq', aria: 'Hasil' },
];

const SCI_KEYS: Key[] = [
  { label: 'sin', insert: 'sin(', kind: 'fn' }, { label: 'cos', insert: 'cos(', kind: 'fn' }, { label: 'tan', insert: 'tan(', kind: 'fn' }, { label: 'π', insert: 'π', kind: 'fn' },
  { label: 'asin', insert: 'asin(', kind: 'fn' }, { label: 'acos', insert: 'acos(', kind: 'fn' }, { label: 'atan', insert: 'atan(', kind: 'fn' }, { label: 'e', insert: 'e', kind: 'fn' },
  { label: 'ln', insert: 'ln(', kind: 'fn' }, { label: 'log', insert: 'log(', kind: 'fn', aria: 'Logaritma basis 10' }, { label: '√', insert: '√(', kind: 'fn', aria: 'Akar kuadrat' }, { label: 'n!', insert: '!', kind: 'fn', aria: 'Faktorial' },
  { label: 'x²', insert: '^2', kind: 'fn', aria: 'Kuadrat' }, { label: 'xʸ', insert: '^', kind: 'fn', aria: 'Pangkat' }, { label: '|x|', insert: 'abs(', kind: 'fn', aria: 'Nilai mutlak' }, { label: '10ˣ', insert: '10^', kind: 'fn' },
];

const FN_TAIL = /(?:asin|acos|atan|sin|cos|tan|ln|log|abs|√)\($|[\s\S]$/u;

function Calculator({ scientific }: { scientific: boolean }) {
  const [expr, setExpr] = useState('');
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState('');
  const [angle, setAngle] = useState<AngleMode>('deg');
  const [history, setHistory] = useStored<{ e: string; r: string }[]>('calc:history', []);
  const [showHistory, setShowHistory] = useState(false);

  const preview = useMemo(() => {
    if (!expr || fresh) return '';
    try {
      return formatResult(evaluate(expr, angle));
    } catch {
      return '';
    }
  }, [expr, angle, fresh]);

  const insert = useCallback(
    (tok: string) => {
      setError('');
      if (fresh) {
        const continues = /^[+−×÷^%!]/.test(tok);
        setExpr((e) => (continues ? e + tok : tok));
        setFresh(false);
      } else {
        setExpr((e) => e + tok);
      }
    },
    [fresh],
  );

  const equals = useCallback(() => {
    if (!expr) return;
    try {
      const r = formatResult(evaluate(expr, angle));
      setHistory((h) => [{ e: expr, r }, ...h].slice(0, 15));
      setExpr(r);
      setFresh(true);
      setError('');
    } catch (e) {
      setError(e instanceof MathError ? e.message : 'Ekspresi tidak valid.');
    }
  }, [expr, angle, setHistory]);

  const back = useCallback(() => {
    setError('');
    if (fresh) {
      setExpr('');
      setFresh(false);
      return;
    }
    setExpr((e) => e.replace(FN_TAIL, ''));
  }, [fresh]);

  const clear = useCallback(() => {
    setExpr('');
    setError('');
    setFresh(false);
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const map: Record<string, string> = { '*': '×', '/': '÷', '-': '−', ',': '.' };
    if (/^[0-9.+()%^!]$/.test(k) || map[k]) {
      e.preventDefault();
      insert(map[k] ?? k);
    } else if (k === 'Backspace') {
      e.preventDefault();
      back();
    } else if (k === 'Escape') {
      e.preventDefault();
      clear();
    } else if (k === '=' || (k === 'Enter' && !(e.target instanceof HTMLButtonElement))) {
      e.preventDefault();
      equals();
    }
  };

  const press = (key: Key) => {
    if (key.action === 'clear') clear();
    else if (key.action === 'equals') equals();
    else if (key.insert) insert(key.insert);
  };

  const shown = expr || '0';
  const keyClass = (k: Key) =>
    cn(
      'btn !min-h-[54px] !px-0 text-lg',
      k.kind === 'op' && '!text-accent',
      k.kind === 'fn' && '!min-h-[44px] !text-sm !text-zinc-300',
      k.kind === 'util' && '!text-zinc-300',
      k.kind === 'eq' && 'btn-primary',
    );

  return (
    <div className="mx-auto max-w-md" onKeyDown={onKey}>
      <div className="panel panel-pad space-y-3">
        <div
          tabIndex={0}
          role="group"
          aria-label="Layar kalkulator. Kamu bisa mengetik dengan keyboard."
          className="inset min-h-[96px] cursor-text px-4 py-3 text-right outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <p className="overflow-x-auto whitespace-nowrap font-mono text-[28px] leading-tight text-zinc-50" aria-live="polite">{shown}</p>
          <p className="mt-1 h-5 overflow-x-auto whitespace-nowrap font-mono text-sm text-zinc-500">{error ? <span className="text-red-300">{error}</span> : preview ? `= ${preview}` : ''}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {scientific ? (
            <Segmented value={angle} onChange={setAngle} options={[{ value: 'deg', label: 'DEG' }, { value: 'rad', label: 'RAD' }]} />
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
              <History size={15} aria-hidden /> Riwayat
            </button>
            <button type="button" className="btn btn-sm btn-icon" onClick={back} aria-label="Hapus karakter terakhir">
              <Delete size={16} aria-hidden />
            </button>
          </div>
        </div>

        {scientific ? (
          <div className="grid grid-cols-4 gap-2">
            {SCI_KEYS.map((k) => (
              <button key={k.label} type="button" className={keyClass(k)} aria-label={k.aria} onClick={() => press(k)}>{k.label}</button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-2">
          {BASIC_KEYS.map((k) => (
            <button key={k.label} type="button" className={keyClass(k)} aria-label={k.aria} onClick={() => press(k)}>{k.label}</button>
          ))}
        </div>
        <Actions>
          <CopyButton text={fresh ? expr : preview || expr} label="Salin hasil" />
        </Actions>
      </div>

      {showHistory ? (
        <div className="panel panel-pad mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Riwayat</h3>
            {history.length ? <button type="button" className="text-xs font-semibold text-accent" onClick={() => setHistory([])}>Hapus riwayat</button> : null}
          </div>
          {history.length === 0 ? <p className="text-sm text-zinc-500">Belum ada perhitungan.</p> : null}
          <ul className="space-y-1.5">
            {history.map((h, i) => (
              <li key={i}>
                <button type="button" className="inset block w-full px-3 py-2 text-right font-mono text-sm hover:border-accent/40" onClick={() => { setExpr(h.r); setFresh(true); }}>
                  <span className="block text-zinc-500">{h.e}</span>
                  <span className="block text-zinc-100">= {h.r}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const BasicCalculator = () => <Calculator scientific={false} />;
const ScientificCalculator = () => <Calculator scientific />;

// ─────────────────────────── Persentase

function Percentage() {
  const [mode, setMode] = useState<'of' | 'is' | 'change'>('of');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const x = parseNum(a);
  const y = parseNum(b);
  let result: string | null = null;
  let note = '';
  if (x !== null && y !== null) {
    if (mode === 'of') {
      result = fmtNum((x / 100) * y, 6);
      note = `${fmtNum(x, 6)}% dari ${fmtNum(y, 6)}`;
    } else if (mode === 'is') {
      if (y === 0) note = 'Pembanding tidak boleh nol.';
      else {
        result = `${fmtNum((x / y) * 100, 6)}%`;
        note = `${fmtNum(x, 6)} adalah ${result} dari ${fmtNum(y, 6)}`;
      }
    } else {
      const c = percentChange(x, y);
      if (c === null) note = 'Nilai awal tidak boleh nol.';
      else {
        result = `${c > 0 ? '+' : ''}${fmtNum(c, 6)}%`;
        note = `${fmtNum(x, 6)} → ${fmtNum(y, 6)}: ${c >= 0 ? 'naik' : 'turun'} ${fmtNum(Math.abs(c), 6)}%`;
      }
    }
  }
  const labels = {
    of: ['Persen (%)', 'Dari angka'],
    is: ['Angka', 'Dari total'],
    change: ['Nilai awal', 'Nilai akhir'],
  }[mode];
  return (
    <Card>
      <Segmented
        value={mode}
        onChange={(v) => { setMode(v); setA(''); setB(''); }}
        options={[{ value: 'of', label: 'X% dari Y' }, { value: 'is', label: 'X dari Y = ?%' }, { value: 'change', label: 'Perubahan %' }]}
      />
      <Row>
        <NumField label={labels[0]} value={a} onChange={setA} />
        <NumField label={labels[1]} value={b} onChange={setB} />
      </Row>
      {result ? (
        <div className="inset px-4 py-3">
          <p className="font-heading text-3xl font-semibold text-accent">{result}</p>
          <p className="text-sm text-zinc-400">{note}</p>
        </div>
      ) : note ? <Notice kind="warn">{note}</Notice> : null}
    </Card>
  );
}

// ─────────────────────────── Diskon

function Discount() {
  const [mode, setMode] = useState<'final' | 'original'>('final');
  const [price, setPrice] = useState('');
  const [pct, setPct] = useState('');
  const p = parseNum(price);
  const d = parseNum(pct);
  const invalid = d !== null && (d < 0 || d >= 100 || (mode === 'final' && d > 100));
  let out: { saved: number; final: number; original: number } | null = null;
  if (p !== null && d !== null && !invalid && p >= 0) {
    if (mode === 'final') {
      const r = applyDiscount(p, d);
      out = { saved: r.discount, final: r.final, original: p };
    } else {
      const original = p / (1 - d / 100);
      out = { saved: original - p, final: p, original };
    }
  }
  return (
    <Card>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'final', label: 'Hitung harga akhir' }, { value: 'original', label: 'Cari harga asli' }]} />
      <Row>
        <NumField label={mode === 'final' ? 'Harga awal' : 'Harga setelah diskon'} value={price} onChange={setPrice} suffix="Rp" />
        <NumField label="Diskon" value={pct} onChange={setPct} suffix="%" />
      </Row>
      {invalid ? <Notice kind="error">Diskon harus antara 0 dan {mode === 'original' ? 'kurang dari ' : ''}100%.</Notice> : null}
      {out ? (
        <StatGrid cols={3}>
          <Stat label="Harga asli" value={fmtNum(out.original, 2)} />
          <Stat label="Hemat" value={fmtNum(out.saved, 2)} />
          <Stat label="Harga akhir" value={fmtNum(out.final, 2)} accent />
        </StatGrid>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Profit

function Profit() {
  const [mode, setMode] = useState<'sell' | 'markup' | 'margin'>('sell');
  const [cost, setCost] = useState('');
  const [val, setVal] = useState('');
  const c = parseNum(cost);
  const v = parseNum(val);
  let sell: number | null = null;
  let error = '';
  if (c !== null && v !== null) {
    if (mode === 'sell') sell = v;
    else if (mode === 'markup') sell = sellFromMarkup(c, v);
    else {
      sell = sellFromMargin(c, v);
      if (sell === null) error = 'Margin harus kurang dari 100%.';
    }
  }
  const r = c !== null && sell !== null ? profitLoss(c, sell) : null;
  return (
    <Card>
      <Segmented
        value={mode}
        onChange={(m) => { setMode(m); setVal(''); }}
        options={[{ value: 'sell', label: 'Dari harga jual' }, { value: 'markup', label: 'Dari markup %' }, { value: 'margin', label: 'Dari margin %' }]}
      />
      <Row>
        <NumField label="Modal / harga beli" value={cost} onChange={setCost} suffix="Rp" />
        <NumField label={mode === 'sell' ? 'Harga jual' : mode === 'markup' ? 'Markup (dari modal)' : 'Margin (dari harga jual)'} value={val} onChange={setVal} suffix={mode === 'sell' ? 'Rp' : '%'} />
      </Row>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {r && sell !== null ? (
        <>
          <StatGrid cols={4}>
            <Stat label="Harga jual" value={fmtNum(sell, 2)} />
            <Stat label={r.isLoss ? 'Rugi' : 'Untung'} value={fmtNum(Math.abs(r.diff), 2)} accent />
            <Stat label="Markup" value={r.markupPct === null ? '—' : `${fmtNum(r.markupPct, 2)}%`} sub="dari modal" />
            <Stat label="Margin" value={r.marginPct === null ? '—' : `${fmtNum(r.marginPct, 2)}%`} sub="dari harga jual" />
          </StatGrid>
          <p className="text-xs text-zinc-500">Markup = untung ÷ modal. Margin = untung ÷ harga jual. Keduanya sering tertukar.</p>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Average (statistik)

function Average() {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseNumberList(text), [text]);
  const s = useMemo(() => computeStats(parsed.numbers), [parsed]);
  const f = (n: number) => fmtNum(n, 4);
  return (
    <Card>
      <TextAreaField
        label="Daftar angka"
        value={text}
        onChange={setText}
        rows={5}
        placeholder="mis. 80 75 90 85  atau satu angka per baris"
        hint="Pisahkan dengan spasi, baris baru, atau titik koma (koma dianggap desimal). Jika hanya koma, koma jadi pemisah."
      />
      {parsed.invalid.length ? <Notice kind="warn">Dilewati (bukan angka): {parsed.invalid.slice(0, 8).join(', ')}</Notice> : null}
      {s ? (
        <>
          <StatGrid cols={4}>
            <Stat label="Rata-rata" value={f(s.mean)} accent />
            <Stat label="Median" value={f(s.median)} />
            <Stat label="Modus" value={s.modes.length ? s.modes.map(f).join(', ') : 'Tidak ada'} sub={s.modes.length ? `${s.modeCount}× muncul` : undefined} />
            <Stat label="Jumlah data" value={s.count} />
            <Stat label="Total" value={f(s.sum)} />
            <Stat label="Min" value={f(s.min)} />
            <Stat label="Maks" value={f(s.max)} />
            <Stat label="Rentang" value={f(s.range)} />
            <Stat label="Std. deviasi (populasi)" value={f(s.stdPop)} />
            <Stat label="Std. deviasi (sampel)" value={s.stdSample === null ? '—' : f(s.stdSample)} />
            <Stat label="Varians (populasi)" value={f(s.variancePop)} />
            <Stat label="Varians (sampel)" value={s.varianceSample === null ? '—' : f(s.varianceSample)} />
          </StatGrid>
          <p className="text-xs text-zinc-500">Data terurut: {s.sorted.slice(0, 60).map(f).join(', ')}{s.sorted.length > 60 ? ' …' : ''}</p>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Pecahan

function FractionCalc() {
  const [a, setA] = useState('1/2');
  const [b, setB] = useState('1/3');
  const [op, setOp] = useState<'+' | '-' | '×' | '÷' | 'simplify'>('+');
  const fa = parseFraction(a);
  const fb = parseFraction(b);
  let res: Fraction | null = null;
  let error = '';
  if (fa && (op === 'simplify' || fb)) {
    try {
      res = op === 'simplify' ? simplify(fa) : fracOp(fa, fb!, op);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal menghitung.';
    }
  }
  const bad = (txt: string, f: Fraction | null) => txt.trim() !== '' && f === null;
  return (
    <Card>
      <Row>
        <TextField label="Pecahan A" value={a} onChange={setA} placeholder="3/4, 1 1/2, 0.75" mono />
        {op !== 'simplify' ? <TextField label="Pecahan B" value={b} onChange={setB} placeholder="2/5" mono /> : null}
      </Row>
      <Segmented
        label="Operasi"
        value={op}
        onChange={setOp}
        options={[{ value: '+', label: '+' }, { value: '-', label: '−' }, { value: '×', label: '×' }, { value: '÷', label: '÷' }, { value: 'simplify', label: 'Sederhanakan' }]}
      />
      {bad(a, fa) || (op !== 'simplify' && bad(b, fb)) ? <Notice kind="error">Format pecahan tidak valid. Contoh: 3/4, 1 1/2, 0.75 (penyebut tidak boleh nol).</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {res ? (
        <KeyValue rows={[['Pecahan', fracToString(res)], ['Campuran', fracToMixed(res)], ['Desimal', fracToDecimal(res)], ['Persen', `${fracToDecimal({ n: res.n * 100n, d: res.d }, 6)}%`]]} />
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Rasio

function Ratio() {
  const [mode, setMode] = useState<'simplify' | 'proportion'>('simplify');
  const [text, setText] = useState('');
  const [pa, setPa] = useState('');
  const [pb, setPb] = useState('');
  const [pc, setPc] = useState('');
  const vals = text.split(/[:\s,;]+/).filter(Boolean).map((t) => Number(t.replace(',', '.')));
  const simp = text.trim() && vals.every((n) => Number.isFinite(n)) ? simplifyRatio(vals) : null;
  const [na, nb, nc] = [parseNum(pa), parseNum(pb), parseNum(pc)];
  const x = na !== null && nb !== null && nc !== null ? solveProportion(na, nb, nc) : null;
  return (
    <Card>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'simplify', label: 'Sederhanakan rasio' }, { value: 'proportion', label: 'Proporsi (a : b = c : x)' }]} />
      {mode === 'simplify' ? (
        <>
          <TextField label="Rasio" value={text} onChange={setText} placeholder="mis. 12:18:30" hint="Pisahkan dengan titik dua, spasi, atau koma. Mendukung 2 angka atau lebih." mono />
          {text.trim() && !simp ? <Notice kind="error">Masukkan minimal dua angka tidak negatif.</Notice> : null}
          {simp ? (
            <div className="inset px-4 py-3">
              <p className="font-heading text-3xl font-semibold text-accent">{simp.join(' : ')}</p>
              <p className="text-sm text-zinc-400">Bentuk paling sederhana dari {vals.join(' : ')}</p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2">
            <NumField label="a" value={pa} onChange={setPa} />
            <NumField label="b" value={pb} onChange={setPb} />
            <NumField label="c" value={pc} onChange={setPc} />
          </div>
          <p className="text-sm text-zinc-400">a : b = c : x</p>
          {na === 0 ? <Notice kind="error">a tidak boleh nol.</Notice> : null}
          {x !== null ? (
            <div className="inset px-4 py-3">
              <p className="font-heading text-3xl font-semibold text-accent">x = {fmtNum(x, 6)}</p>
              <p className="text-sm text-zinc-400">x = (b × c) ÷ a</p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

// ─────────────────────────── Luas & Volume

const UNITS = ['mm', 'cm', 'm', 'km', 'in', 'ft'];

function ShapeTool({ shapes }: { shapes: Shape[] }) {
  const [shapeId, setShapeId] = useState(shapes[0].id);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [unit, setUnit] = useState('cm');
  const shape = shapes.find((s) => s.id === shapeId) ?? shapes[0];
  const res = runShape(shape, vals);
  const suffix = (u: 'linear' | 'area' | 'volume') => (u === 'linear' ? unit : u === 'area' ? `${unit}²` : `${unit}³`);
  return (
    <Card>
      <Row>
        <SelectField label="Bangun" value={shapeId} onChange={(v) => { setShapeId(v); setVals({}); }} options={shapes.map((s) => ({ value: s.id, label: s.label }))} />
        <SelectField label="Satuan panjang" value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        {shape.fields.map((f) => (
          <NumField key={f.key} label={f.label} value={vals[f.key] ?? ''} onChange={(v) => setVals((p) => ({ ...p, [f.key]: v }))} suffix={unit} />
        ))}
      </div>
      <p className="text-xs text-zinc-500">Rumus: {shape.formula}</p>
      {!res.ok && res.error ? <Notice kind="error">{res.error}</Notice> : null}
      {res.ok ? (
        <StatGrid cols={res.results.length >= 3 ? 3 : 2}>
          {res.results.map((r, i) => (
            <Stat key={r.label} label={r.label} value={`${fmtNum(r.value, 4)} ${suffix(r.unit)}`} accent={i === 0} />
          ))}
        </StatGrid>
      ) : null}
    </Card>
  );
}

const Area = () => <ShapeTool shapes={AREA_SHAPES} />;
const VolumeTool = () => <ShapeTool shapes={VOLUME_SHAPES} />;

const tools: Record<string, ComponentType> = {
  'basic-calculator': BasicCalculator,
  'scientific-calculator': ScientificCalculator,
  percentage: Percentage,
  discount: Discount,
  profit: Profit,
  average: Average,
  fraction: FractionCalc,
  ratio: Ratio,
  area: Area,
  volume: VolumeTool,
};

export default tools;
