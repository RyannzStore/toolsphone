'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Dices, Plus, Trash2 } from 'lucide-react';
import { pick, randomInt, randomRange, shuffle } from '@/lib/random';
import { contrastRatio, gradientCss, parseColor, parseHex, rgbToHex, rgbToHsl, type GradientStop } from '@/lib/color';
import {
  Actions, Card, CopyButton, DownloadButton, FileDrop, KeyValue, Notice, NumField, Output, Row, SelectField, Segmented,
  TextAreaField, TextField, downloadBlob, parseNum,
} from '@/components/tools/ui';
import { UNIT_CATEGORIES } from '@/lib/units';
import { UnitConverter, TemperatureConverter } from './timeunit';
import { cn } from '@/lib/utils';

// ─────────────────────────── Random Number

function RandomNumber() {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [unique, setUnique] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [error, setError] = useState('');

  const roll = () => {
    const lo = parseNum(min);
    const hi = parseNum(max);
    const n = parseNum(count);
    if (lo === null || hi === null || n === null || !Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || !Number.isInteger(n)) {
      setError('Min, maks, dan jumlah harus bilangan bulat.');
      return;
    }
    if (lo > hi) return setError('Nilai minimum tidak boleh lebih besar dari maksimum.');
    if (n < 1 || n > 1000) return setError('Jumlah harus 1–1000.');
    if (unique && n > hi - lo + 1) return setError(`Rentang hanya berisi ${hi - lo + 1} angka — tidak cukup untuk ${n} angka unik.`);
    setError('');
    if (!unique) {
      setResults(Array.from({ length: n }, () => randomRange(lo, hi)));
      return;
    }
    const seen = new Set<number>();
    while (seen.size < n) seen.add(randomRange(lo, hi));
    setResults([...seen]);
  };

  const text = results.join(', ');
  return (
    <Card>
      <Row>
        <NumField label="Minimum" value={min} onChange={setMin} />
        <NumField label="Maksimum" value={max} onChange={setMax} />
        <NumField label="Jumlah angka" value={count} onChange={setCount} hint="1–1000" />
        <label className="flex min-h-[44px] items-center gap-2 self-end text-sm text-zinc-300">
          <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> Tanpa angka kembar
        </label>
      </Row>
      <Actions>
        <button type="button" className="btn btn-primary" onClick={roll}>
          <Dices size={16} aria-hidden /> Acak
        </button>
        <CopyButton text={text} />
      </Actions>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {results.length === 1 ? <p className="text-center font-heading text-6xl font-semibold text-accent">{results[0]}</p> : null}
      {results.length > 1 ? <Output label="Hasil" value={text} rows={4} /> : null}
    </Card>
  );
}

// ─────────────────────────── Random Name Picker

function NamePicker() {
  const [text, setText] = useState('');
  const [count, setCount] = useState('1');
  const [removeWinner, setRemoveWinner] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [error, setError] = useState('');

  const names = useMemo(() => text.split('\n').map((s) => s.trim()).filter(Boolean), [text]);

  const draw = () => {
    const n = parseNum(count);
    if (names.length === 0) return setError('Isi daftar nama dulu (satu nama per baris).');
    if (n === null || !Number.isInteger(n) || n < 1) return setError('Jumlah pemenang harus bilangan bulat ≥ 1.');
    if (n > names.length) return setError(`Hanya ada ${names.length} nama.`);
    setError('');
    const chosen = shuffle(names).slice(0, n);
    setWinners(chosen);
    if (removeWinner) {
      const left = [...names];
      for (const w of chosen) left.splice(left.indexOf(w), 1);
      setText(left.join('\n'));
    }
  };

  return (
    <Card>
      <TextAreaField label="Daftar nama" value={text} onChange={setText} rows={7} placeholder={'Andi\nBudi\nCitra'} hint={`${names.length} nama`} />
      <Row>
        <NumField label="Jumlah dipilih" value={count} onChange={setCount} />
        <label className="flex min-h-[44px] items-center gap-2 self-end text-sm text-zinc-300">
          <input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} /> Hapus yang terpilih dari daftar
        </label>
      </Row>
      <Actions>
        <button type="button" className="btn btn-primary" onClick={draw}>
          <Dices size={16} aria-hidden /> Pilih acak
        </button>
        <button type="button" className="btn" onClick={() => setWinners(shuffle(names))} disabled={names.length < 2}>Acak urutan</button>
      </Actions>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {winners.length ? (
        <ol className="space-y-1.5">
          {winners.map((w, i) => (
            <li key={`${w}-${i}`} className="inset flex items-center gap-3 px-3 py-2">
              <span className="font-heading text-sm text-accent">{i + 1}</span>
              <span className="min-w-0 break-words text-zinc-100">{w}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Warna

function ColorInfo({ hex }: { hex: string }) {
  const c = parseHex(hex);
  if (!c) return null;
  const hsl = rgbToHsl(c);
  const white = contrastRatio(c, { r: 255, g: 255, b: 255 });
  const black = contrastRatio(c, { r: 0, g: 0, b: 0 });
  const rows: [string, ReactNode][] = [
    ['HEX', <span key="h" className="flex items-center gap-2">{hex.toUpperCase()} <CopyButton text={hex.toUpperCase()} /></span>],
    ['RGB', <span key="r" className="flex items-center gap-2">{`rgb(${c.r}, ${c.g}, ${c.b})`} <CopyButton text={`rgb(${c.r}, ${c.g}, ${c.b})`} /></span>],
    ['HSL', <span key="s" className="flex items-center gap-2">{`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} <CopyButton text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} /></span>],
    ['Kontras vs putih', `${white.toFixed(2)}:1 ${white >= 4.5 ? '(lulus AA teks)' : '(tidak lulus AA teks)'}`],
    ['Kontras vs hitam', `${black.toFixed(2)}:1 ${black >= 4.5 ? '(lulus AA teks)' : '(tidak lulus AA teks)'}`],
  ];
  return <KeyValue rows={rows} />;
}

function ColorPicker() {
  const [hex, setHex] = useState('#ff3b30');
  const [eyeError, setEyeError] = useState('');
  const hasEye = typeof window !== 'undefined' && 'EyeDropper' in window;

  const eyedrop = async () => {
    try {
      const ED = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const r = await new ED().open();
      setHex(r.sRGBHex);
      setEyeError('');
    } catch {
      setEyeError('Pengambilan warna dibatalkan atau tidak tersedia.');
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        <input type="color" aria-label="Pilih warna" value={hex} onChange={(e) => setHex(e.target.value)} className="h-24 w-24 cursor-pointer rounded-2xl border border-white/10 bg-transparent p-1" />
        <div className="h-24 min-w-[120px] flex-1 rounded-2xl border border-white/10" style={{ backgroundColor: hex }} aria-hidden />
      </div>
      {hasEye ? (
        <div>
          <button type="button" className="btn btn-sm" onClick={eyedrop}>Ambil warna dari layar</button>
          {eyeError ? <p className="mt-1 text-xs text-zinc-500">{eyeError}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Pipet layar tidak didukung browser ini (tersedia di Chrome/Edge desktop).</p>
      )}
      <ColorInfo hex={hex} />
    </Card>
  );
}

function HexRgb() {
  const [input, setInput] = useState('#1e90ff');
  const rgb = parseColor(input);
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const hex = rgb ? rgbToHex(rgb) : '';
  return (
    <Card>
      <TextField label="Warna" value={input} onChange={setInput} mono placeholder="#1e90ff, rgb(30,144,255), hsl(210,100%,56%)" hint="Format HEX (3/6/8 digit), rgb(), rgba(), hsl(), atau “r, g, b”." />
      {rgb && hsl ? (
        <>
          <div className="h-16 rounded-2xl border border-white/10" style={{ backgroundColor: hex }} aria-hidden />
          <ColorInfo hex={hex} />
          {parseHex(input)?.a !== undefined ? <Notice>Nilai alpha ({parseHex(input)?.a}) diabaikan pada hasil di atas.</Notice> : null}
        </>
      ) : input.trim() ? (
        <Notice kind="error">Format warna tidak dikenali atau di luar rentang (RGB 0–255, S/L 0–100%).</Notice>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Gradient

function GradientGenerator() {
  const [type, setType] = useState<'linear' | 'radial' | 'conic'>('linear');
  const [angle, setAngle] = useState('90');
  const [stops, setStops] = useState<(GradientStop & { id: number })[]>([
    { id: 1, color: '#ff3b30', pos: 0 },
    { id: 2, color: '#5856d6', pos: 100 },
  ]);
  const nextId = useRef(3);
  const css = gradientCss(type, parseNum(angle) ?? 0, stops);
  const patch = (id: number, p: Partial<GradientStop>) => setStops((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <Card>
      <div className="h-40 rounded-2xl border border-white/10" style={{ backgroundImage: css }} aria-label="Pratinjau gradient" role="img" />
      <Segmented value={type} onChange={setType} options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }, { value: 'conic', label: 'Conic' }]} />
      {type !== 'radial' ? <NumField label="Sudut" value={angle} onChange={setAngle} suffix="deg" /> : null}
      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
            <input type="color" aria-label={`Warna ${i + 1}`} value={s.color} onChange={(e) => patch(s.id, { color: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
            <label className="block">
              <span className="label">Posisi {i + 1}: {s.pos}%</span>
              <input type="range" min={0} max={100} value={s.pos} onChange={(e) => patch(s.id, { pos: Number(e.target.value) })} className="w-full accent-[rgb(var(--accent))]" />
            </label>
            <button type="button" className="btn btn-sm !px-3" aria-label={`Hapus warna ${i + 1}`} disabled={stops.length <= 2} onClick={() => setStops((a) => a.filter((x) => x.id !== s.id))}>
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" disabled={stops.length >= 8} onClick={() => setStops((a) => [...a, { id: nextId.current++, color: '#ffffff', pos: 50 }])}>
          <Plus size={15} aria-hidden /> Tambah warna
        </button>
      </div>
      <Output label="CSS" value={`background-image: ${css};`} rows={3} />
    </Card>
  );
}

// ─────────────────────────── Lorem Ipsum

const LOREM_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
  'ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure ' +
  'dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non ' +
  'proident sunt in culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci ' +
  'a odio nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer ' +
  'in mauris eu nibh euismod gravida duis ac tellus et risus vulputate vehicula donec lobortis risus a elit etiam tempor'
).split(' ');

function makeSentence(): string {
  const n = 8 + randomInt(10);
  const words = Array.from({ length: n }, () => pick(LOREM_WORDS));
  const s = words.join(' ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}

function makeParagraph(): string {
  return Array.from({ length: 3 + randomInt(4) }, makeSentence).join(' ');
}

function LoremIpsum() {
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [count, setCount] = useState('3');
  const [classic, setClassic] = useState(true);
  const [seed, setSeed] = useState(0);

  const text = useMemo(() => {
    void seed;
    const n = Math.min(Math.max(Math.floor(parseNum(count) ?? 1), 1), unit === 'words' ? 2000 : 100);
    let out: string;
    if (unit === 'paragraphs') out = Array.from({ length: n }, makeParagraph).join('\n\n');
    else if (unit === 'sentences') out = Array.from({ length: n }, makeSentence).join(' ');
    else out = Array.from({ length: n }, () => pick(LOREM_WORDS)).join(' ');
    if (classic) out = out.replace(/^[^\s]+ [^\s]+/, 'Lorem ipsum');
    return out;
  }, [unit, count, classic, seed]);

  return (
    <Card>
      <Row>
        <SelectField label="Satuan" value={unit} onChange={(v) => setUnit(v as typeof unit)} options={[{ value: 'paragraphs', label: 'Paragraf' }, { value: 'sentences', label: 'Kalimat' }, { value: 'words', label: 'Kata' }]} />
        <NumField label="Jumlah" value={count} onChange={setCount} hint={unit === 'words' ? 'Maks 2000' : 'Maks 100'} />
      </Row>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={classic} onChange={(e) => setClassic(e.target.checked)} /> Mulai dengan “Lorem ipsum”
      </label>
      <Output label="Hasil" value={text} rows={10} mono={false} actions={<button type="button" className="btn btn-sm" onClick={() => setSeed((s) => s + 1)}>Acak ulang</button>} />
    </Card>
  );
}

// ─────────────────────────── QR Contact (vCard)

/** Escape nilai vCard 3.0: backslash, titik koma, koma, newline. */
function vEsc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function buildVcard(f: Record<'first' | 'last' | 'org' | 'title' | 'phone' | 'email' | 'url' | 'note', string>): string | null {
  if (!f.first.trim() && !f.last.trim() && !f.org.trim()) return null;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(f.last.trim())};${vEsc(f.first.trim())};;;`, `FN:${vEsc(`${f.first} ${f.last}`.trim() || f.org.trim())}`];
  if (f.org.trim()) lines.push(`ORG:${vEsc(f.org.trim())}`);
  if (f.title.trim()) lines.push(`TITLE:${vEsc(f.title.trim())}`);
  if (f.phone.trim()) lines.push(`TEL;TYPE=CELL:${vEsc(f.phone.trim())}`);
  if (f.email.trim()) lines.push(`EMAIL:${vEsc(f.email.trim())}`);
  if (f.url.trim()) lines.push(`URL:${f.url.trim().replace(/[\r\n]/g, '')}`);
  if (f.note.trim()) lines.push(`NOTE:${vEsc(f.note.trim())}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function QrContact() {
  const [f, setF] = useState({ first: '', last: '', org: '', title: '', phone: '', email: '', url: '', note: '' });
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const vcard = useMemo(() => buildVcard(f), [f]);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      if (!vcard) {
        setDataUrl('');
        setError('');
        return;
      }
      try {
        const QR = (await import('qrcode')).default;
        const url = await QR.toDataURL(vcard, { errorCorrectionLevel: 'M', margin: 2, width: 640 });
        if (!alive) return;
        setDataUrl(url);
        setError('');
      } catch {
        if (!alive) return;
        setDataUrl('');
        setError('Data kontak terlalu panjang untuk satu QR Code. Persingkat catatan atau URL.');
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [vcard]);

  return (
    <Card>
      <Row>
        <TextField label="Nama depan" value={f.first} onChange={set('first')} />
        <TextField label="Nama belakang" value={f.last} onChange={set('last')} />
        <TextField label="Perusahaan / organisasi" value={f.org} onChange={set('org')} />
        <TextField label="Jabatan" value={f.title} onChange={set('title')} />
        <TextField label="Telepon" value={f.phone} onChange={set('phone')} type="tel" placeholder="+62812…" />
        <TextField label="Email" value={f.email} onChange={set('email')} type="email" inputMode="email" />
        <TextField label="Website" value={f.url} onChange={set('url')} inputMode="url" placeholder="https://…" />
        <TextField label="Catatan" value={f.note} onChange={set('note')} />
      </Row>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!vcard ? <Notice>Isi minimal nama atau organisasi.</Notice> : null}
      {dataUrl ? (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR Code kontak" className="h-auto w-full max-w-[280px] rounded-xl border border-white/10 bg-white p-1" />
          <Actions>
            <DownloadButton primary label="PNG" onClick={() => { const a = document.createElement('a'); a.href = dataUrl; a.download = 'qr-kontak.png'; a.click(); }} />
            <DownloadButton label="vCard (.vcf)" onClick={() => vcard && downloadBlob(new Blob([vcard], { type: 'text/vcard;charset=utf-8' }), 'kontak.vcf')} />
          </Actions>
        </div>
      ) : null}
      <p className="text-xs text-zinc-500">Dibuat di perangkatmu; data kontak tidak dikirim ke server.</p>
    </Card>
  );
}

// ─────────────────────────── Barcode

const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'Code 128 (teks bebas ASCII)', sample: 'TOOLSPHONE-001' },
  { value: 'EAN13', label: 'EAN-13 (12–13 digit)', sample: '590123412345' },
  { value: 'EAN8', label: 'EAN-8 (7–8 digit)', sample: '9638507' },
  { value: 'UPC', label: 'UPC-A (11–12 digit)', sample: '12345678901' },
  { value: 'CODE39', label: 'Code 39 (A–Z, 0–9, - . $ / + % spasi)', sample: 'TOOLSPHONE' },
  { value: 'ITF', label: 'ITF (digit, jumlah genap)', sample: '12345670' },
];

function Barcode() {
  const [format, setFormat] = useState('CODE128');
  const [value, setValue] = useState('TOOLSPHONE-001');
  const [showText, setShowText] = useState(true);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const el = svgRef.current;
      if (!el) return;
      if (!value.trim()) {
        el.innerHTML = '';
        setReady(false);
        setError('');
        return;
      }
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        if (!alive) return;
        el.innerHTML = '';
        let invalid = false;
        JsBarcode(el, value, {
          format,
          displayValue: showText,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 12,
          height: 90,
          fontSize: 16,
          valid: (ok: boolean) => {
            invalid = !ok;
          },
        });
        if (invalid) throw new Error('invalid');
        setReady(true);
        setError('');
      } catch {
        if (!alive) return;
        if (svgRef.current) svgRef.current.innerHTML = '';
        setReady(false);
        setError(`Isi tidak valid untuk format ${format}. Cek panjang dan karakter yang diizinkan.`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [format, value, showText]);

  const svgString = () => {
    const el = svgRef.current;
    if (!el) return '';
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  };
  const png = () => {
    const svg = svgString();
    const el = svgRef.current;
    if (!svg || !el) return;
    const w = Number(el.getAttribute('width')?.replace('px', '')) || 300;
    const h = Number(el.getAttribute('height')?.replace('px', '')) || 150;
    const img = new Image();
    img.onload = () => {
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && downloadBlob(b, 'barcode.png'), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  const fmt = BARCODE_FORMATS.find((x) => x.value === format);

  return (
    <Card>
      <Row>
        <SelectField label="Format" value={format} onChange={(v) => { setFormat(v); const s = BARCODE_FORMATS.find((x) => x.value === v)?.sample; if (s) setValue(s); }} options={BARCODE_FORMATS.map(({ value: v, label }) => ({ value: v, label }))} />
        <TextField label="Isi barcode" value={value} onChange={setValue} mono hint={fmt ? `Contoh: ${fmt.sample}` : undefined} />
      </Row>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Tampilkan teks di bawah barcode
      </label>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className={cn('flex justify-center overflow-auto rounded-xl bg-white p-2', !ready && 'hidden')}>
        <svg ref={svgRef} role="img" aria-label="Barcode hasil" />
      </div>
      {ready ? (
        <Actions>
          <DownloadButton primary label="PNG" onClick={png} />
          <DownloadButton label="SVG" onClick={() => downloadBlob(new Blob([svgString()], { type: 'image/svg+xml' }), 'barcode.svg')} />
        </Actions>
      ) : null}
      <p className="text-xs text-zinc-500">EAN/UPC: digit pemeriksa dihitung otomatis bila belum disertakan. Barcode produk resmi tetap perlu nomor dari GS1.</p>
    </Card>
  );
}

// ─────────────────────────── Meme Generator

function MemeGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [size, setSize] = useState('9');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (!file) {
      imgRef.current = null;
      setLoaded((n) => n + 1);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setError('');
      setLoaded((n) => n + 1);
    };
    img.onerror = () => {
      imgRef.current = null;
      setError('File tidak bisa dibaca sebagai gambar.');
      setLoaded((n) => n + 1);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const maxSide = 1600;
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k);
    const h = Math.round(img.naturalHeight * k);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const fs = Math.round((w * Math.min(Math.max(parseNum(size) ?? 9, 3), 20)) / 100);
    ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, fs / 7);
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';

    const wrap = (t: string): string[] => {
      const words = t.toUpperCase().split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > w * 0.94 && cur) {
          lines.push(cur);
          cur = word;
        } else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    };
    const pad = fs * 0.35;
    ctx.textBaseline = 'top';
    wrap(top).forEach((line, i) => {
      const y = pad + i * fs * 1.05;
      ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    });
    ctx.textBaseline = 'bottom';
    const bl = wrap(bottom);
    bl.forEach((line, i) => {
      const y = h - pad - (bl.length - 1 - i) * fs * 1.05;
      ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    });
  }, [top, bottom, size]);

  useEffect(() => {
    draw();
  }, [draw, loaded]);

  return (
    <Card>
      <FileDrop accept="image/*" label={file ? file.name : 'Pilih gambar'} hint="Diproses di perangkatmu, tidak diunggah." onFiles={(f) => setFile(f[0])} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Row>
        <TextField label="Teks atas" value={top} onChange={setTop} />
        <TextField label="Teks bawah" value={bottom} onChange={setBottom} />
        <NumField label="Ukuran huruf" value={size} onChange={setSize} suffix="%" hint="3–20 (% lebar gambar)" />
      </Row>
      {file && !error ? (
        <>
          <canvas ref={canvasRef} className="h-auto max-w-full rounded-xl border border-white/10" aria-label="Pratinjau meme" />
          <Actions>
            <DownloadButton primary label="Unduh PNG" onClick={() => canvasRef.current?.toBlob((b) => b && downloadBlob(b, 'meme.png'), 'image/png')} />
          </Actions>
        </>
      ) : (
        <Notice>Pilih gambar untuk mulai.</Notice>
      )}
    </Card>
  );
}

// ─────────────────────────── Universal Converter

function UniversalConverter() {
  const cats = [...UNIT_CATEGORIES.map((c) => ({ value: c.id, label: c.label })), { value: 'temperature', label: 'Suhu' }];
  const [cat, setCat] = useState('length');
  return (
    <div className="space-y-4">
      <Card>
        <SelectField label="Jenis satuan" value={cat} onChange={setCat} options={cats} />
      </Card>
      {cat === 'temperature' ? <TemperatureConverter /> : <UnitConverter key={cat} categoryId={cat} />}
    </div>
  );
}


// --- About Me ---
function AboutMe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [form, setForm] = useState({ nama: 'Rannz', umur: '17', pekerjaan: 'Pelajar', lokasi: 'Banten, Indonesia', status: 'aktif', email: 'ranggagntng170@gmail.com', website: 'toolora.web.id' })
  const [pos, setPos] = useState({ x: 290, y: 340, size: 52, gap: 72 })
  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const img = new Image(); img.src = '/kartu-mentahan.jpg'
    img.onload = () => {
      c.width = img.width; c.height = img.height
      ctx.drawImage(img, 0, 0)
      const sx = c.width / 1600; const sy = c.height / 1200
      ctx.font = `bold ${pos.size * sx}px monospace`
      ctx.fillStyle = '#d6ffdd'; ctx.fillText('termux ', pos.x*sx, pos.y*sy)
      ctx.fillStyle = '#22ff66'; ctx.fillText('$', (pos.x+170)*sx, pos.y*sy)
      ctx.fillStyle = '#d6ffdd'; ctx.fillText(' ~ /data/diri', (pos.x+210)*sx, pos.y*sy)
      ctx.font = `${pos.size * sx}px monospace`
      const lines = ['', 'data_diri = {', `  "nama": "${form.nama}",`, `  "umur": ${form.umur},`, `  "pekerjaan": "${form.pekerjaan}",`, `  "lokasi": "${form.lokasi}",`, `  "status": "${form.status}",`, `  "email": "${form.email}",`, `  "website": "${form.website}",`, '}', '', '# generated: 2024-11-12 | python 3.11']
      lines.forEach((line, i) => { ctx.fillStyle = i === lines.length-1 ? '#22aa55' : '#d6ffdd'; ctx.fillText(line, (pos.x+20)*sx, (pos.y + 90 + i*pos.gap)*sy) })
    }
  }, [form, pos])
  useEffect(()=>{ draw() }, [draw])
  const download = () => { draw(); setTimeout(()=>{ const c=canvasRef.current; if(!c) return; const a=document.createElement('a'); a.download=`about-me-${form.nama}.jpg`; a.href=c.toDataURL('image/jpeg',0.95); a.click() },300) }
  const set = (k: string, v: string) => setForm(prev=>({...prev,[k]:v}))
  return (
    <div className="space-y-4">
      <Card><div className="grid grid-cols-2 gap-3">
        {Object.keys(form).map(k=>(<TextField key={k} label={k} value={(form as Record<string, string>)[k]} onChange={(v)=>set(k,v)} />))}
      </div></Card>
      <Card><canvas ref={canvasRef} className="w-full rounded-2xl border" />
      <Row><NumField label="X" value={String(pos.x)} onChange={(v)=>setPos(prev=>({...prev,x:Number(v)||0}))} /><NumField label="Y" value={String(pos.y)} onChange={(v)=>setPos(prev=>({...prev,y:Number(v)||0}))} /><NumField label="Font" value={String(pos.size)} onChange={(v)=>setPos(prev=>({...prev,size:Number(v)||52}))} /></Row>
      <Actions><button type="button" className="btn btn-primary" onClick={download}>Download Hasil</button></Actions>
      <Notice>Kalo teks geser, ubah X / Y / Font sampe pas di kartu.</Notice></Card>
    </div>
  )
}

const tools: Record<string, ComponentType> = {

  'random-number': RandomNumber,
  'random-name-picker': NamePicker,
  'color-picker': ColorPicker,
  'hex-rgb': HexRgb,
  'gradient-generator': GradientGenerator,
  'lorem-ipsum': LoremIpsum,
  'qr-contact': QrContact,
  'barcode': Barcode,
  'about-me': AboutMe,
  'meme-generator': MemeGenerator,
  'universal-converter': UniversalConverter,
};

export default tools;

