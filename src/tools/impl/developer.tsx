'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Loader } from 'lucide-react';
import { formatJson, jsonStats, minifyJson, validateJson, type JsonFormatResult } from '@/lib/json';
import { formatXml, minifyXml } from '@/lib/xml';
import { diffLines } from '@/lib/diff';
import {
  Actions, Card, KeyValue, Notice, Output, Row, Segmented, SelectField, Stat, StatGrid, TextAreaField,
  TextField, Toggle, downloadText,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

// ─────────────────────────── JSON

function JsonError({ error: e }: { error: NonNullable<JsonFormatResult['error']> }) {
  return (
    <Notice kind="error">
      <p className="font-semibold">Baris {e.line}, kolom {e.column}</p>
      <p className="mt-0.5">{e.message}</p>
    </Notice>
  );
}

function JsonFormatter() {
  const [text, setText] = useState('');
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2');
  const [sort, setSort] = useState(false);
  const r = useMemo(
    () => (text.trim() ? formatJson(text, indent === 'tab' ? '\t' : Number(indent), sort) : null),
    [text, indent, sort],
  );
  return (
    <Card>
      <TextAreaField label="JSON" value={text} onChange={setText} rows={10} mono placeholder='{"nama":"ToolsPhone","versi":1}' />
      <Row>
        <Segmented
          label="Indentasi"
          value={indent}
          onChange={setIndent}
          options={[{ value: '2', label: '2 spasi' }, { value: '4', label: '4 spasi' }, { value: 'tab', label: 'Tab' }]}
        />
        <Toggle label="Urutkan key A–Z" hint="Berlaku sampai objek bersarang" checked={sort} onChange={setSort} />
      </Row>
      {r?.error ? <JsonError error={r.error} /> : null}
      {r?.ok && r.precisionWarning ? (
        <Notice kind="warn">Ada angka bulat lebih dari 15 digit. Angka sebesar itu bisa kehilangan presisi saat diparse — simpan sebagai teks bila perlu.</Notice>
      ) : null}
      <Output label="Hasil" value={r?.ok ? r.output : ''} rows={12} />
    </Card>
  );
}

function JsonMinifier() {
  const [text, setText] = useState('');
  const r = useMemo(() => (text.trim() ? minifyJson(text) : null), [text]);
  const before = new TextEncoder().encode(text).length;
  const after = r?.ok ? new TextEncoder().encode(r.output).length : 0;
  return (
    <Card>
      <TextAreaField label="JSON" value={text} onChange={setText} rows={9} mono />
      {r?.error ? <JsonError error={r.error} /> : null}
      {r?.ok ? (
        <p className="text-xs text-zinc-500">
          {before} → {after} byte (hemat {before ? Math.round(((before - after) / before) * 100) : 0}%)
        </p>
      ) : null}
      <Output label="JSON ringkas" value={r?.ok ? r.output : ''} rows={7} />
    </Card>
  );
}

function JsonValidator() {
  const [text, setText] = useState('');
  const check = useMemo(() => (text.trim() ? validateJson(text) : null), [text]);
  const stats = useMemo(() => (check?.ok ? jsonStats(text) : null), [check, text]);
  const lines = text.split('\n');
  return (
    <Card>
      <TextAreaField label="JSON" value={text} onChange={setText} rows={10} mono />
      {check?.ok ? (
        <>
          <Notice kind="success">JSON valid.</Notice>
          {stats ? (
            <StatGrid cols={4}>
              <Stat label="Tipe" value={stats.type} />
              <Stat label="Jumlah key" value={stats.keys} />
              <Stat label="Kedalaman" value={stats.depth} />
              <Stat label="Ukuran" value={`${stats.bytes} B`} />
            </StatGrid>
          ) : null}
        </>
      ) : null}
      {check && !check.ok ? (
        <>
          <Notice kind="error">
            <p className="font-semibold">JSON tidak valid — baris {check.line}, kolom {check.column}</p>
            <p className="mt-0.5">{check.message}</p>
          </Notice>
          <pre className="inset overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-zinc-300">
            {lines[check.line - 1]?.slice(0, 200)}
            {'\n'}
            {' '.repeat(Math.max(check.column - 1, 0))}
            <span className="text-red-400">^</span>
          </pre>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── XML

function XmlFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [indent, setIndent] = useState('2');
  const res = useMemo(() => {
    if (!text.trim()) return null;
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      const msg = (err.textContent ?? 'XML tidak valid').replace(/\s+/g, ' ').trim();
      return { ok: false as const, error: msg.slice(0, 300) };
    }
    const unit = indent === 'tab' ? '\t' : ' '.repeat(Number(indent));
    return { ok: true as const, output: mode === 'format' ? formatXml(text, unit) : minifyXml(text) };
  }, [text, mode, indent]);
  return (
    <Card>
      <TextAreaField label="XML" value={text} onChange={setText} rows={9} mono placeholder="<root><item id=&quot;1&quot;>Halo</item></root>" />
      <Row>
        <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'format', label: 'Rapikan' }, { value: 'minify', label: 'Padatkan' }]} />
        {mode === 'format' ? (
          <SelectField label="Indentasi" value={indent} onChange={setIndent} options={[{ value: '2', label: '2 spasi' }, { value: '4', label: '4 spasi' }, { value: 'tab', label: 'Tab' }]} />
        ) : null}
      </Row>
      {res && !res.ok ? <Notice kind="error"><p className="font-semibold">XML tidak well-formed</p><p className="mt-0.5 break-words font-mono text-xs">{res.error}</p></Notice> : null}
      {res?.ok ? <Notice kind="success">XML well-formed.</Notice> : null}
      <Output label="Hasil" value={res?.ok ? res.output : ''} rows={10} />
    </Card>
  );
}

// ─────────────────────────── Prettier (HTML / CSS / JS)

type Lang = 'html' | 'css' | 'js';

async function runPrettier(lang: Lang, code: string, opts: { tabWidth: number; useTabs: boolean; semi: boolean; singleQuote: boolean }): Promise<string> {
  const prettier = await import('prettier/standalone');
  const base = { tabWidth: opts.tabWidth, useTabs: opts.useTabs, printWidth: 100 };
  if (lang === 'html') {
    const html = (await import('prettier/plugins/html')).default;
    return prettier.format(code, { ...base, parser: 'html', plugins: [html] });
  }
  if (lang === 'css') {
    const postcss = (await import('prettier/plugins/postcss')).default;
    return prettier.format(code, { ...base, parser: 'css', plugins: [postcss], singleQuote: opts.singleQuote });
  }
  const [babel, estree] = await Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]);
  return prettier.format(code, {
    ...base,
    parser: 'babel',
    plugins: [babel.default, estree.default as never],
    semi: opts.semi,
    singleQuote: opts.singleQuote,
  });
}

function CodeFormatter({ lang, placeholder }: { lang: Lang; placeholder: string }) {
  const [code, setCode] = useState('');
  const [out, setOut] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('2');
  const [semi, setSemi] = useState(true);
  const [single, setSingle] = useState(false);
  const [minify, setMinify] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    const id = ++tick.current;
    if (!code.trim()) {
      setOut('');
      setError('');
      setBusy(false);
      return;
    }
    if (lang === 'css' && minify) {
      setOut(minifyCss(code));
      setError('');
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await runPrettier(lang, code, { tabWidth: tab === 'tab' ? 2 : Number(tab), useTabs: tab === 'tab', semi, singleQuote: single });
        if (id !== tick.current) return;
        setOut(res.trimEnd());
        setError('');
      } catch (e) {
        if (id !== tick.current) return;
        setOut('');
        setError(e instanceof Error ? e.message.split('\n').slice(0, 6).join('\n') : 'Gagal memformat kode.');
      } finally {
        if (id === tick.current) setBusy(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [code, lang, tab, semi, single, minify]);

  return (
    <Card>
      <TextAreaField label="Kode" value={code} onChange={setCode} rows={10} mono placeholder={placeholder} />
      <Row>
        <SelectField label="Indentasi" value={tab} onChange={setTab} options={[{ value: '2', label: '2 spasi' }, { value: '4', label: '4 spasi' }, { value: 'tab', label: 'Tab' }]} />
        {lang === 'css' ? <Toggle label="Padatkan (minify)" checked={minify} onChange={setMinify} /> : null}
        {lang === 'js' ? <Toggle label="Titik koma di akhir baris" checked={semi} onChange={setSemi} /> : null}
        {lang !== 'html' ? <Toggle label="Tanda kutip tunggal" checked={single} onChange={setSingle} /> : null}
      </Row>
      {busy ? <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader size={14} className="animate-spin" aria-hidden /> Memformat…</p> : null}
      {error ? <Notice kind="error"><pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre></Notice> : null}
      <Output label="Hasil" value={out} rows={12} />
      <Actions>
        <button type="button" className="btn btn-sm" disabled={!out} onClick={() => downloadText(out, `formatted.${lang === 'js' ? 'js' : lang}`)}>Unduh file</button>
      </Actions>
    </Card>
  );
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

const HtmlFormatter = () => <CodeFormatter lang="html" placeholder="<div><p>Halo</p></div>" />;
const CssFormatter = () => <CodeFormatter lang="css" placeholder="body{margin:0;color:#fff}" />;
const JavaScriptFormatter = () => <CodeFormatter lang="js" placeholder="const a=1;function x(){return a}" />;

// ─────────────────────────── Regex

interface RegexMatch {
  index: number;
  text: string;
  groups: (string | null)[];
  named: Record<string, string | null>;
}
type RegexResult = { ok: true; matches: RegexMatch[]; truncated: boolean } | { ok: false; error: string };

// Dieksekusi di Web Worker agar regex "catastrophic backtracking" tidak membekukan halaman.
const WORKER_SRC = `
self.onmessage = (e) => {
  const { pattern, flags, text, max } = e.data;
  try {
    const f = flags.includes('g') ? flags : flags + 'g';
    const re = new RegExp(pattern, f);
    const matches = [];
    let truncated = false;
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({
        index: m.index,
        text: m[0],
        groups: m.slice(1).map((g) => (g === undefined ? null : g)),
        named: m.groups ? Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, v === undefined ? null : v])) : {},
      });
      if (m[0] === '') re.lastIndex++;
      if (matches.length >= max) { truncated = true; break; }
      if (!flags.includes('g')) break;
    }
    self.postMessage({ ok: true, matches, truncated });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};`;

function useRegex(pattern: string, flags: string, text: string): { result: RegexResult | null; running: boolean } {
  const [result, setResult] = useState<RegexResult | null>(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pattern) {
      setResult(null);
      setRunning(false);
      return;
    }
    // Validasi sintaks cepat di thread utama (tanpa mengeksekusi pada teks)
    try {
      new RegExp(pattern, flags);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Regex tidak valid' });
      setRunning(false);
      return;
    }
    setRunning(true);
    const timer = window.setTimeout(() => {
      workerRef.current?.terminate();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      urlRef.current = url;
      const w = new Worker(url);
      workerRef.current = w;
      const kill = window.setTimeout(() => {
        w.terminate();
        setResult({ ok: false, error: 'Regex terlalu lama diproses (> 2 detik). Kemungkinan backtracking berlebihan — sederhanakan pola.' });
        setRunning(false);
      }, 2000);
      w.onmessage = (ev: MessageEvent<RegexResult>) => {
        window.clearTimeout(kill);
        setResult(ev.data);
        setRunning(false);
        w.terminate();
      };
      w.onerror = () => {
        window.clearTimeout(kill);
        setResult({ ok: false, error: 'Gagal menjalankan regex.' });
        setRunning(false);
      };
      w.postMessage({ pattern, flags, text, max: 500 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pattern, flags, text]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  return { result, running };
}

function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const [text, setText] = useState('');
  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('');
  const { result, running } = useRegex(pattern, flagStr, text);

  const highlighted = useMemo(() => {
    if (!result?.ok || !result.matches.length) return null;
    const parts: { t: string; hit: boolean }[] = [];
    let pos = 0;
    for (const m of result.matches) {
      if (m.text === '') continue;
      if (m.index < pos) continue;
      if (m.index > pos) parts.push({ t: text.slice(pos, m.index), hit: false });
      parts.push({ t: m.text, hit: true });
      pos = m.index + m.text.length;
    }
    if (pos < text.length) parts.push({ t: text.slice(pos), hit: false });
    return parts;
  }, [result, text]);

  return (
    <Card>
      <TextField label="Pola regex" value={pattern} onChange={setPattern} placeholder="(\d{4})-(\d{2})-(\d{2})" mono />
      <div>
        <span className="label">Flag</span>
        <div className="flex flex-wrap gap-2">
          {(
            [['g', 'g · global'], ['i', 'i · abaikan huruf'], ['m', 'm · multibaris'], ['s', 's · dot = baris baru'], ['u', 'u · unicode']] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={flags[k]} onClick={() => setFlags((f) => ({ ...f, [k]: !f[k] }))}>{label}</button>
          ))}
        </div>
      </div>
      <TextAreaField label="Teks uji" value={text} onChange={setText} rows={6} mono />
      {running ? <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader size={14} className="animate-spin" aria-hidden /> Menguji…</p> : null}
      {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
      {result?.ok ? (
        <>
          <p className="text-sm text-zinc-300" role="status">
            <span className="font-semibold text-accent">{result.matches.length}</span> kecocokan{result.truncated ? ' (ditampilkan 500 pertama)' : ''}
          </p>
          {highlighted ? (
            <pre className="inset max-h-60 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-300">
              {highlighted.map((p, i) => (p.hit ? <mark key={i} className="rounded bg-accent/30 px-0.5 text-zinc-50">{p.t}</mark> : <span key={i}>{p.t}</span>))}
            </pre>
          ) : null}
          {result.matches.length ? (
            <div className="max-h-72 space-y-2 overflow-auto">
              {result.matches.slice(0, 100).map((m, i) => (
                <div key={i} className="inset px-3 py-2 text-sm">
                  <p className="font-mono text-zinc-100">
                    <span className="text-zinc-500">#{i + 1} @{m.index} </span>
                    {m.text === '' ? <em className="text-zinc-500">(kosong)</em> : m.text}
                  </p>
                  {m.groups.length ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-zinc-400">
                      {m.groups.map((g, gi) => (
                        <li key={gi} className="font-mono">grup {gi + 1}: {g === null ? <em>tidak ikut cocok</em> : g}</li>
                      ))}
                    </ul>
                  ) : null}
                  {Object.keys(m.named).length ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-zinc-400">
                      {Object.entries(m.named).map(([k, v]) => (
                        <li key={k} className="font-mono">{k}: {v === null ? <em>tidak ikut cocok</em> : v}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Text diff

function TextDiff() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [onlyChanges, setOnlyChanges] = useState(false);
  const result = useMemo(() => {
    if (!a && !b) return null;
    const norm = (l: string) => {
      let x = l;
      if (ignoreWs) x = x.replace(/\s+/g, ' ').trim();
      if (ignoreCase) x = x.toLowerCase();
      return x;
    };
    return diffLines(a.split(/\r\n|\r|\n/), b.split(/\r\n|\r|\n/), ignoreCase || ignoreWs ? norm : undefined);
  }, [a, b, ignoreCase, ignoreWs]);
  const shown = result ? (onlyChanges ? result.ops.filter((o) => o.type !== 'eq') : result.ops) : [];
  return (
    <Card>
      <Row>
        <TextAreaField label="Teks asli (A)" value={a} onChange={setA} rows={8} mono />
        <TextAreaField label="Teks baru (B)" value={b} onChange={setB} rows={8} mono />
      </Row>
      <div className="grid gap-1 sm:grid-cols-3">
        <Toggle label="Abaikan huruf besar/kecil" checked={ignoreCase} onChange={setIgnoreCase} />
        <Toggle label="Abaikan perbedaan spasi" checked={ignoreWs} onChange={setIgnoreWs} />
        <Toggle label="Hanya tampilkan perubahan" checked={onlyChanges} onChange={setOnlyChanges} />
      </div>
      {result ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Ditambah" value={`+${result.added}`} />
            <Stat label="Dihapus" value={`−${result.removed}`} />
            <Stat label="Sama" value={result.unchanged} />
          </StatGrid>
          {result.approximate ? <Notice kind="warn">Teks sangat besar — perbandingan disederhanakan (semua baris yang berbeda ditandai).</Notice> : null}
          {result.added + result.removed === 0 ? <Notice kind="success">Kedua teks identik.</Notice> : null}
          <div className="inset max-h-[28rem] overflow-auto py-1 font-mono text-[13px]" role="region" aria-label="Hasil perbandingan" tabIndex={0}>
            {shown.map((op, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2 whitespace-pre-wrap break-words px-3 py-0.5',
                  op.type === 'add' && 'bg-emerald-500/10 text-emerald-200',
                  op.type === 'del' && 'bg-red-500/10 text-red-200',
                  op.type === 'eq' && 'text-zinc-400',
                )}
              >
                <span aria-hidden className="w-3 flex-none select-none text-zinc-500">{op.type === 'add' ? '+' : op.type === 'del' ? '−' : ' '}</span>
                <span className="sr-only">{op.type === 'add' ? 'Ditambah: ' : op.type === 'del' ? 'Dihapus: ' : ''}</span>
                <span className="min-w-0">{op.text === '' ? ' ' : op.text}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Timestamp

function pad(n: number, w = 2) {
  return String(n).padStart(w, '0');
}

function relative(ms: number): string {
  const diff = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const units: [number, string][] = [[31536000, 'tahun'], [2592000, 'bulan'], [86400, 'hari'], [3600, 'jam'], [60, 'menit'], [1, 'detik']];
  for (const [sec, name] of units) {
    if (abs >= sec) {
      const v = Math.floor(abs / sec);
      return diff < 0 ? `${v} ${name} yang lalu` : `${v} ${name} lagi`;
    }
  }
  return 'sekarang';
}

function TimestampConverter() {
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<'auto' | 's' | 'ms'>('auto');
  const [dt, setDt] = useState('');
  const [tz, setTz] = useState<'local' | 'utc'>('local');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parsed = useMemo(() => {
    const t = input.trim();
    if (!t) return null;
    if (!/^-?\d+(\.\d+)?$/.test(t)) return { error: 'Masukkan angka timestamp (mis. 1700000000).' };
    const n = Number(t);
    const isMs = unit === 'ms' || (unit === 'auto' && Math.abs(n) >= 1e11);
    const ms = isMs ? n : n * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return { error: 'Timestamp di luar rentang tanggal yang didukung.' };
    return { ms, isMs, d };
  }, [input, unit]);

  const fromDt = useMemo(() => {
    if (!dt) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dt);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
    const ms = tz === 'utc' ? Date.UTC(y, mo - 1, d, h, mi, s) : new Date(y, mo - 1, d, h, mi, s).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [dt, tz]);

  const fmtLocal = (d: Date) =>
    new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'long' }).format(d);
  const fmtUtc = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;

  return (
    <div className="space-y-4">
      <Card title="Sekarang">
        <StatGrid>
          <Stat label="Unix (detik)" value={Math.floor(now / 1000)} accent />
          <Stat label="Unix (milidetik)" value={now} />
        </StatGrid>
        <Actions>
          <button type="button" className="btn btn-sm" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>Pakai sebagai input</button>
        </Actions>
      </Card>

      <Card title="Timestamp → Tanggal">
        <Row>
          <TextField label="Timestamp" value={input} onChange={setInput} inputMode="numeric" placeholder="1700000000" mono />
          <SelectField label="Satuan" value={unit} onChange={(v) => setUnit(v as typeof unit)} options={[{ value: 'auto', label: 'Otomatis' }, { value: 's', label: 'Detik' }, { value: 'ms', label: 'Milidetik' }]} />
        </Row>
        {parsed && 'error' in parsed ? <Notice kind="error">{parsed.error}</Notice> : null}
        {parsed && 'd' in parsed ? (
          <KeyValue
            rows={[
              ['Terdeteksi', parsed.isMs ? 'milidetik' : 'detik'],
              ['Waktu lokal', fmtLocal(parsed.d)],
              ['UTC', fmtUtc(parsed.d)],
              ['ISO 8601', parsed.d.toISOString()],
              ['Relatif', relative(parsed.ms)],
            ]}
          />
        ) : null}
      </Card>

      <Card title="Tanggal → Timestamp">
        <Row>
          <div>
            <label className="label" htmlFor="ts-dt">Tanggal & jam</label>
            <input id="ts-dt" type="datetime-local" step={1} value={dt} onChange={(e) => setDt(e.target.value)} className="input" />
          </div>
          <Segmented label="Zona waktu input" value={tz} onChange={setTz} options={[{ value: 'local', label: 'Lokal' }, { value: 'utc', label: 'UTC' }]} />
        </Row>
        {fromDt !== null ? (
          <KeyValue rows={[['Unix (detik)', String(Math.floor(fromDt / 1000))], ['Unix (milidetik)', String(fromDt)], ['ISO 8601', new Date(fromDt).toISOString()]]} />
        ) : null}
      </Card>
    </div>
  );
}

const tools: Record<string, ComponentType> = {
  'json-formatter': JsonFormatter,
  'json-minifier': JsonMinifier,
  'json-validator': JsonValidator,
  'xml-formatter': XmlFormatter,
  'html-formatter': HtmlFormatter,
  'css-formatter': CssFormatter,
  'javascript-formatter': JavaScriptFormatter,
  'regex-tester': RegexTester,
  'text-diff': TextDiff,
  'timestamp-converter': TimestampConverter,
};

export default tools;
