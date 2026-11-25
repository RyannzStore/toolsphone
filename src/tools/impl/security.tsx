'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import {
  CHARSETS, buildPools, entropyBits, generatePassword, randomString, strengthLabel, uuidv4,
  type PasswordOptions,
} from '@/lib/random';
import { EncodingError, decodeBase64, encodeBase64, toHex, urlDecode, urlEncode } from '@/lib/encoding';
import { md5 } from '@/lib/md5';
import {
  Actions, Card, CopyButton, DownloadButton, FileDrop, Notice, NumField, Output, Row, Segmented, SelectField, TextAreaField, TextField, Toggle, downloadBlob, parseNum,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

// ─────────────────────────── Password

function PasswordGenerator() {
  const [o, setO] = useState<PasswordOptions>({
    length: 16, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false, exclude: '',
  });
  const [count, setCount] = useState('1');
  const [list, setList] = useState<string[]>([]);
  const [error, setError] = useState('');

  const generate = useCallback(() => {
    try {
      const n = Math.min(Math.max(parseNum(count) ?? 1, 1), 50);
      setList(Array.from({ length: Math.floor(n) }, () => generatePassword(o)));
      setError('');
    } catch (e) {
      setList([]);
      setError(e instanceof Error ? e.message : 'Gagal membuat password');
    }
  }, [o, count]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pools = buildPools(o);
  const poolSize = pools.join('').length;
  const bits = entropyBits(o.length, poolSize);
  const s = strengthLabel(bits);
  const bar = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'][s.level];
  const set = <K extends keyof PasswordOptions>(k: K, v: PasswordOptions[K]) => setO((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <div className="space-y-2">
        {list.map((p, i) => (
          <div key={i} className="inset flex items-center gap-2 px-3 py-2">
            <code className="min-w-0 flex-1 select-all break-all font-mono text-[15px] text-zinc-50">{p}</code>
            <CopyButton text={p} />
          </div>
        ))}
        {error ? <Notice kind="error">{error}</Notice> : null}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-semibold text-zinc-300">{s.label}</span>
          <span className="text-zinc-500">≈ {Math.round(bits)} bit entropi</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pw-len">Panjang: <span className="text-zinc-100">{o.length}</span></label>
        <input
          id="pw-len" type="range" className="range" min={4} max={64} value={o.length}
          style={{ ['--p' as string]: `${((o.length - 4) / 60) * 100}%` }}
          onChange={(e) => set('length', Number(e.target.value))}
        />
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle label="Huruf kecil (a–z)" checked={o.lower} onChange={(v) => set('lower', v)} />
        <Toggle label="Huruf besar (A–Z)" checked={o.upper} onChange={(v) => set('upper', v)} />
        <Toggle label="Angka (0–9)" checked={o.digits} onChange={(v) => set('digits', v)} />
        <Toggle label="Simbol" hint={CHARSETS.symbols} checked={o.symbols} onChange={(v) => set('symbols', v)} />
        <Toggle label="Hindari karakter mirip" hint="I l 1 O 0 o" checked={o.excludeAmbiguous} onChange={(v) => set('excludeAmbiguous', v)} />
      </div>
      <Row>
        <TextField label="Karakter yang dikecualikan" value={o.exclude ?? ''} onChange={(v) => set('exclude', v)} placeholder="mis. {}[]" mono />
        <NumField label="Jumlah password" value={count} onChange={setCount} hint="1–50" />
      </Row>
      <Actions>
        <button type="button" className="btn btn-primary" onClick={generate}>
          <RefreshCw size={16} aria-hidden /> Buat password
        </button>
      </Actions>
      <p className="text-xs text-zinc-500">Dibuat di perangkatmu memakai generator acak kriptografis browser. Tidak ada yang dikirim atau disimpan.</p>
    </Card>
  );
}

// ─────────────────────────── Random string

const PRESETS: Record<string, { label: string; chars: string }> = {
  alnum: { label: 'Huruf + angka', chars: CHARSETS.lower + CHARSETS.upper + CHARSETS.digits },
  lower: { label: 'Huruf kecil', chars: CHARSETS.lower },
  upper: { label: 'Huruf besar', chars: CHARSETS.upper },
  digits: { label: 'Angka saja', chars: CHARSETS.digits },
  hex: { label: 'Hex', chars: '0123456789abcdef' },
  base32: { label: 'Base32 (tanpa mirip)', chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' },
  custom: { label: 'Kustom…', chars: '' },
};

function RandomString() {
  const [preset, setPreset] = useState('alnum');
  const [custom, setCustom] = useState('');
  const [length, setLength] = useState('24');
  const [count, setCount] = useState('5');
  const [out, setOut] = useState('');
  const [error, setError] = useState('');

  const generate = useCallback(() => {
    const alphabet = preset === 'custom' ? custom : PRESETS[preset].chars;
    const len = Math.floor(parseNum(length) ?? 0);
    const n = Math.floor(parseNum(count) ?? 0);
    if (!alphabet) return setError('Isi karakter kustom terlebih dahulu.');
    if (len < 1 || len > 1024) return setError('Panjang harus 1–1024.');
    if (n < 1 || n > 100) return setError('Jumlah harus 1–100.');
    setError('');
    setOut(Array.from({ length: n }, () => randomString(len, alphabet)).join('\n'));
  }, [preset, custom, length, count]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <SelectField label="Karakter" value={preset} onChange={setPreset} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
      {preset === 'custom' ? <TextField label="Karakter kustom" value={custom} onChange={setCustom} placeholder="mis. ABC123" mono /> : null}
      <Row>
        <NumField label="Panjang" value={length} onChange={setLength} hint="1–1024" />
        <NumField label="Jumlah" value={count} onChange={setCount} hint="1–100" />
      </Row>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Actions>
        <button type="button" className="btn btn-primary" onClick={generate}><RefreshCw size={16} aria-hidden /> Buat</button>
      </Actions>
      <Output label="Hasil" value={out} rows={Math.min(10, Math.max(3, out.split('\n').length))} />
    </Card>
  );
}

// ─────────────────────────── UUID

function UuidGenerator() {
  const [count, setCount] = useState('5');
  const [upper, setUpper] = useState(false);
  const [braces, setBraces] = useState(false);
  const [nodash, setNodash] = useState(false);
  const [seed, setSeed] = useState(0);
  const base = useMemo(() => {
    void seed;
    const n = Math.min(Math.max(Math.floor(parseNum(count) ?? 1), 1), 500);
    return Array.from({ length: n }, () => uuidv4());
  }, [count, seed]);
  const out = base
    .map((u) => {
      let x = nodash ? u.replace(/-/g, '') : u;
      if (upper) x = x.toUpperCase();
      if (braces) x = `{${x}}`;
      return x;
    })
    .join('\n');
  return (
    <Card>
      <NumField label="Jumlah UUID" value={count} onChange={setCount} hint="1–500" />
      <div className="grid gap-1 sm:grid-cols-3">
        <Toggle label="HURUF BESAR" checked={upper} onChange={setUpper} />
        <Toggle label="Tanpa tanda hubung" checked={nodash} onChange={setNodash} />
        <Toggle label="Dalam {kurung}" checked={braces} onChange={setBraces} />
      </div>
      <Actions>
        <button type="button" className="btn btn-primary" onClick={() => setSeed((s) => s + 1)}><RefreshCw size={16} aria-hidden /> Buat ulang</button>
      </Actions>
      <Output label="UUID v4" value={out} rows={Math.min(12, base.length + 1)} />
    </Card>
  );
}

// ─────────────────────────── Hash

const ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Algo = (typeof ALGOS)[number];

async function digest(algo: Algo, data: Uint8Array): Promise<string> {
  if (algo === 'MD5') return md5(data);
  const buf = await crypto.subtle.digest(algo, data as BufferSource);
  return toHex(buf);
}

function HashGenerator() {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [text, setText] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [upper, setUpper] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [compare, setCompare] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = mode === 'text' ? new TextEncoder().encode(text) : fileBytes;
        if (!data) {
          setResults({});
          return;
        }
        const entries = await Promise.all(ALGOS.map(async (a) => [a, await digest(a, data)] as const));
        if (alive) {
          setResults(Object.fromEntries(entries));
          setError('');
        }
      } catch {
        if (alive) setError('Gagal menghitung hash di browser ini.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, text, fileBytes]);

  const fmt = (h: string) => (upper ? h.toUpperCase() : h);
  const cmp = compare.trim().toLowerCase().replace(/\s+/g, '');
  const matched = cmp ? ALGOS.find((a) => results[a] === cmp) : undefined;

  return (
    <Card>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[{ value: 'text', label: 'Teks' }, { value: 'file', label: 'File' }]}
      />
      {mode === 'text' ? (
        <TextAreaField label="Teks" value={text} onChange={setText} rows={4} placeholder="Teks yang akan di-hash (UTF-8)" />
      ) : (
        <div className="space-y-2">
          <FileDrop
            hint="Maksimal 200 MB · diproses di perangkatmu"
            onFiles={async ([f]) => {
              if (f.size > 200 * 1024 * 1024) return setError('File terlalu besar (maks 200 MB).');
              setError('');
              setFileInfo({ name: f.name, size: f.size });
              setFileBytes(new Uint8Array(await f.arrayBuffer()));
            }}
          />
          {fileInfo ? <p className="text-xs text-zinc-400">{fileInfo.name} · {fileInfo.size.toLocaleString('id-ID')} byte</p> : null}
        </div>
      )}
      <Toggle label="Tampilkan huruf besar" checked={upper} onChange={setUpper} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <div className="space-y-2.5">
        {ALGOS.map((a) => (
          <div key={a} className="inset px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {a} {a === 'MD5' || a === 'SHA-1' ? <span className="ml-1 normal-case text-amber-300/80">(tidak aman untuk password)</span> : null}
              </span>
              <CopyButton text={results[a] ? fmt(results[a]) : ''} />
            </div>
            <code className="block break-all font-mono text-[13px] text-zinc-100">{results[a] ? fmt(results[a]) : '—'}</code>
          </div>
        ))}
      </div>
      <TextField label="Bandingkan dengan hash lain (opsional)" value={compare} onChange={setCompare} placeholder="Tempel hash untuk dicek" mono />
      {cmp ? (
        matched ? <Notice kind="success">Cocok dengan {matched}.</Notice> : <Notice kind="warn">Tidak cocok dengan hash mana pun di atas.</Notice>
      ) : null}
      <p className="text-xs text-zinc-500">Hash adalah fungsi satu arah — bukan enkripsi dan tidak bisa “di-decode”.</p>
    </Card>
  );
}

// ─────────────────────────── Base64 / URL

function Base64Encoder() {
  const [text, setText] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const out = useMemo(() => encodeBase64(text, { urlSafe, padding }), [text, urlSafe, padding]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={6} placeholder="Teks yang akan di-encode (UTF-8 aman)" />
      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle label="URL-safe (- dan _)" checked={urlSafe} onChange={setUrlSafe} />
        <Toggle label="Sertakan padding (=)" checked={padding} onChange={setPadding} />
      </div>
      <Output label="Base64" value={out} rows={6} />
    </Card>
  );
}

function Base64Decoder() {
  const [text, setText] = useState('');
  const res = useMemo(() => {
    try {
      return { ok: true as const, value: decodeBase64(text) };
    } catch (e) {
      return { ok: false as const, error: e instanceof EncodingError ? e.message : 'Gagal decode.' };
    }
  }, [text]);
  return (
    <Card>
      <TextAreaField label="Base64" value={text} onChange={setText} rows={6} placeholder="Tempel Base64 (mendukung URL-safe & data URL)" mono />
      {text.trim() && !res.ok ? <Notice kind="error">{res.error}</Notice> : null}
      <Output label="Teks hasil decode" value={res.ok ? res.value : ''} rows={6} mono={false} />
    </Card>
  );
}

function UrlTool({ mode }: { mode: 'encode' | 'decode' }) {
  const [text, setText] = useState('');
  const [scope, setScope] = useState<'component' | 'full'>('component');
  const [plus, setPlus] = useState(true);
  const res = useMemo(() => {
    try {
      return { ok: true as const, value: mode === 'encode' ? urlEncode(text, scope) : urlDecode(text, scope, plus) };
    } catch (e) {
      return { ok: false as const, error: e instanceof EncodingError ? e.message : 'Gagal memproses.' };
    }
  }, [text, scope, plus, mode]);
  return (
    <Card>
      <TextAreaField label={mode === 'encode' ? 'Teks / URL' : 'Teks ter-encode'} value={text} onChange={setText} rows={5} mono />
      <Segmented
        label="Cakupan"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'component', label: 'Komponen (semua simbol)' },
          { value: 'full', label: 'URL utuh' },
        ]}
      />
      {mode === 'decode' ? <Toggle label="Anggap + sebagai spasi" hint="Umum pada query string form" checked={plus} onChange={setPlus} /> : null}
      {text && !res.ok ? <Notice kind="error">{res.error}</Notice> : null}
      <Output label="Hasil" value={res.ok ? res.value : ''} rows={5} />
    </Card>
  );
}
const UrlEncoder = () => <UrlTool mode="encode" />;
const UrlDecoder = () => <UrlTool mode="decode" />;

// ─────────────────────────── QR

type Ec = 'L' | 'M' | 'Q' | 'H';

function QrGenerator() {
  const [text, setText] = useState('https://toolsphone.auctionnuvexastore.biz.id');
  const [ec, setEc] = useState<Ec>('M');
  const [size, setSize] = useState('512');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [margin, setMargin] = useState('2');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const svgRef = useRef('');

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      if (!text) {
        setDataUrl('');
        setError('');
        return;
      }
      try {
        const QR = (await import('qrcode')).default;
        const px = Math.min(Math.max(Math.floor(parseNum(size) ?? 512), 128), 2048);
        const m = Math.min(Math.max(Math.floor(parseNum(margin) ?? 2), 0), 16);
        const opts = { errorCorrectionLevel: ec, margin: m, width: px, color: { dark: fg, light: bg } } as const;
        const [url, svg] = await Promise.all([QR.toDataURL(text, opts), QR.toString(text, { ...opts, type: 'svg' })]);
        if (!alive) return;
        svgRef.current = svg;
        setDataUrl(url);
        setError('');
      } catch (e) {
        if (!alive) return;
        setDataUrl('');
        setError(e instanceof Error && /too big|capacity/i.test(e.message) ? 'Teks terlalu panjang untuk QR Code.' : 'Gagal membuat QR Code.');
      }
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [text, ec, size, fg, bg, margin]);

  return (
    <Card>
      <TextAreaField label="Isi QR (teks, link, Wi-Fi, dll.)" value={text} onChange={setText} rows={3} />
      <Row>
        <SelectField
          label="Koreksi kesalahan"
          value={ec}
          onChange={(v) => setEc(v as Ec)}
          options={[
            { value: 'L', label: 'L — 7% (paling padat)' },
            { value: 'M', label: 'M — 15%' },
            { value: 'Q', label: 'Q — 25%' },
            { value: 'H', label: 'H — 30% (paling tahan rusak)' },
          ]}
        />
        <NumField label="Ukuran (px)" value={size} onChange={setSize} hint="128–2048" />
        <NumField label="Margin (modul)" value={margin} onChange={setMargin} hint="0–16" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="qr-fg">Warna QR</label>
            <input id="qr-fg" type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="input !p-1" />
          </div>
          <div>
            <label className="label" htmlFor="qr-bg">Latar</label>
            <input id="qr-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="input !p-1" />
          </div>
        </div>
      </Row>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {dataUrl ? (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR Code hasil" className="h-auto w-full max-w-[280px] rounded-xl border border-white/10 bg-white p-1" />
          <Actions>
            <DownloadButton primary label="PNG" onClick={() => {
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = 'qrcode.png';
              a.click();
            }} />
            <DownloadButton label="SVG" onClick={() => downloadBlob(new Blob([svgRef.current], { type: 'image/svg+xml' }), 'qrcode.svg')} />
          </Actions>
        </div>
      ) : null}
      <p className="text-xs text-zinc-500">Pastikan kontras warna cukup tinggi (QR gelap di latar terang) supaya mudah dipindai.</p>
    </Card>
  );
}

function QrReader() {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const decode = useCallback(async (data: Uint8ClampedArray, w: number, h: number) => {
    const jsQR = (await import('jsqr')).default;
    return jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
  }, []);

  const startCamera = async () => {
    setError('');
    setResult('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('Browser ini tidak mendukung akses kamera.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCamera(true);
      await new Promise((r) => setTimeout(r, 0)); // tunggu <video> dirender
      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let busy = false;
      const tick = async () => {
        if (!streamRef.current) return;
        if (!busy && video.readyState >= 2 && video.videoWidth) {
          busy = true;
          const scale = Math.min(1, 640 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          const code = img ? await decode(img.data, img.width, img.height) : null;
          busy = false;
          if (code?.data) {
            setResult(code.data);
            stopCamera();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      stopCamera();
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.'
          : 'Kamera tidak dapat dibuka. Gunakan opsi gambar di bawah.',
      );
    }
  };

  const fromImage = async (file: File) => {
    setError('');
    setResult('');
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      const img = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      const code = img ? await decode(img.data, img.width, img.height) : null;
      if (code?.data) setResult(code.data);
      else setError('QR Code tidak ditemukan pada gambar. Coba gambar yang lebih jelas.');
    } catch {
      setError('File bukan gambar yang valid.');
    }
  };

  const isUrl = /^https?:\/\//i.test(result);

  return (
    <Card>
      <FileDrop accept="image/*" label="Pilih gambar berisi QR Code" hint="Atau gunakan kamera" onFiles={([f]) => void fromImage(f)} />
      <Actions>
        {camera ? (
          <button type="button" className="btn" onClick={stopCamera}><CameraOff size={16} aria-hidden /> Matikan kamera</button>
        ) : (
          <button type="button" className="btn" onClick={() => void startCamera()}><Camera size={16} aria-hidden /> Pindai dengan kamera</button>
        )}
      </Actions>
      {camera ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
        </div>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {result ? (
        <div className="space-y-2">
          <Output label="Isi QR Code" value={result} rows={4} mono={false} />
          {isUrl ? (
            <>
              <Notice kind="warn">Periksa link sebelum dibuka — QR bisa mengarah ke situs berbahaya.</Notice>
              <a className="btn btn-sm" href={result} target="_blank" rel="noopener noreferrer nofollow">Buka link</a>
            </>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-zinc-500">Gambar dan video kamera diproses di perangkatmu, tidak diunggah.</p>
    </Card>
  );
}

const tools: Record<string, ComponentType> = {
  'password-generator': PasswordGenerator,
  'random-string': RandomString,
  'uuid-generator': UuidGenerator,
  'hash-generator': HashGenerator,
  'base64-encoder': Base64Encoder,
  'base64-decoder': Base64Decoder,
  'url-encoder': UrlEncoder,
  'url-decoder': UrlDecoder,
  'qr-generator': QrGenerator,
  'qr-reader': QrReader,
};

export default tools;
