'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import {
  Actions, Card, DownloadButton, FileDrop, KeyValue, Notice, NumField, Row, SelectField, Segmented, Stat, StatGrid,
  TextField, downloadBlob, parseNum,
} from '@/components/tools/ui';

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_PDF_BYTES = 80 * 1024 * 1024;
const MAX_PIXELS = 100_000_000; // batas keamanan memori canvas

// ─────────────────────────── helper gambar

interface Loaded {
  img: HTMLImageElement;
  file: File;
  w: number;
  h: number;
  url: string;
}

function readImage(file: File): Promise<Loaded> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error(`Ukuran file maks ${formatBytes(MAX_IMAGE_BYTES)}.`));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) {
        URL.revokeObjectURL(url);
        return reject(new Error('Resolusi gambar terlalu besar untuk diproses di browser.'));
      }
      resolve({ img, file, w: img.naturalWidth, h: img.naturalHeight, url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File tidak bisa dibaca sebagai gambar (format tidak didukung browser?).'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error('Browser gagal membuat file.'));
        if (b.type !== type) return reject(new Error(`Browser ini tidak mendukung ekspor ${type}.`));
        resolve(b);
      },
      type,
      quality,
    );
  });
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Isi latar putih (untuk format tanpa alpha seperti JPEG). */
function paintWhite(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const baseName = (n: string) => n.replace(/\.[^.]+$/, '') || 'gambar';

function useImage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const prev = useRef<string>('');
  useEffect(() => () => { if (prev.current) URL.revokeObjectURL(prev.current); }, []);
  const load = useCallback(async (files: File[]) => {
    try {
      const l = await readImage(files[0]);
      if (prev.current) URL.revokeObjectURL(prev.current);
      prev.current = l.url;
      setLoaded(l);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca gambar.');
    }
  }, []);
  return { loaded, error, load };
}

function Preview({ blob, label }: { blob: Blob | null; label: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) return setUrl('');
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={label} className="max-h-80 w-auto max-w-full rounded-xl border border-white/10 bg-[repeating-conic-gradient(#222_0_25%,#2d2d2d_0_50%)] bg-[length:16px_16px]" />;
}

const picker = (onFiles: (f: File[]) => void) => (
  <FileDrop accept="image/*" onFiles={onFiles} label="Pilih gambar" hint="Diproses di perangkatmu — tidak diunggah ke server." />
);

// ─────────────────────────── Compress

function CompressImage() {
  const { loaded, error, load } = useImage();
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState(70);
  const [maxSide, setMaxSide] = useState('');
  const [out, setOut] = useState<Blob | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        const lim = parseNum(maxSide);
        const k = lim && lim > 0 ? Math.min(1, lim / Math.max(loaded.w, loaded.h)) : 1;
        const c = makeCanvas(loaded.w * k, loaded.h * k);
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia.');
        paintWhite(ctx, c.width, c.height);
        ctx.drawImage(loaded.img, 0, 0, c.width, c.height);
        const b = await toBlob(c, format, quality / 100);
        if (alive) {
          setOut(b);
          setErr('');
        }
      } catch (e) {
        if (alive) {
          setOut(null);
          setErr(e instanceof Error ? e.message : 'Gagal kompres.');
        }
      }
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [loaded, format, quality, maxSide]);

  return (
    <Card>
      {picker(load)}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {loaded ? (
        <>
          <Row>
            <Segmented value={format} onChange={setFormat} label="Format hasil" options={[{ value: 'image/jpeg', label: 'JPG' }, { value: 'image/webp', label: 'WebP' }]} />
            <NumField label="Sisi terpanjang maks (px, opsional)" value={maxSide} onChange={setMaxSide} placeholder={`${Math.max(loaded.w, loaded.h)}`} />
          </Row>
          <label className="block">
            <span className="label">Kualitas: {quality}%</span>
            <input type="range" min={5} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
          </label>
          {err ? <Notice kind="error">{err}</Notice> : null}
          {out ? (
            <>
              <StatGrid cols={3}>
                <Stat label="Asli" value={formatBytes(loaded.file.size)} sub={`${loaded.w}×${loaded.h}`} />
                <Stat label="Hasil" value={formatBytes(out.size)} accent />
                <Stat label="Perubahan" value={`${out.size <= loaded.file.size ? '−' : '+'}${Math.abs(Math.round((1 - out.size / loaded.file.size) * 100))}%`} />
              </StatGrid>
              {out.size >= loaded.file.size ? <Notice kind="warn">Hasil tidak lebih kecil dari aslinya. Turunkan kualitas atau ukuran.</Notice> : null}
              <Preview blob={out} label="Hasil kompres" />
              <DownloadButton primary label="Unduh" onClick={() => downloadBlob(out, `${baseName(loaded.file.name)}-compressed.${EXT[format]}`)} />
            </>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Resize

function ResizeImage() {
  const { loaded, error, load } = useImage();
  const [mode, setMode] = useState<'px' | 'pct'>('px');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [pct, setPct] = useState('50');
  const [lock, setLock] = useState(true);
  const [format, setFormat] = useState('image/png');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loaded) {
      setW(String(loaded.w));
      setH(String(loaded.h));
    }
  }, [loaded]);

  const target = useMemo(() => {
    if (!loaded) return null;
    if (mode === 'pct') {
      const p = parseNum(pct);
      return p && p > 0 ? { w: Math.round((loaded.w * p) / 100), h: Math.round((loaded.h * p) / 100) } : null;
    }
    const tw = parseNum(w);
    const th = parseNum(h);
    return tw && th && tw >= 1 && th >= 1 ? { w: Math.round(tw), h: Math.round(th) } : null;
  }, [loaded, mode, w, h, pct]);

  const onW = (v: string) => {
    setW(v);
    const n = parseNum(v);
    if (lock && loaded && n) setH(String(Math.max(1, Math.round((n * loaded.h) / loaded.w))));
  };
  const onH = (v: string) => {
    setH(v);
    const n = parseNum(v);
    if (lock && loaded && n) setW(String(Math.max(1, Math.round((n * loaded.w) / loaded.h))));
  };

  const run = async () => {
    if (!loaded || !target) return;
    if (target.w * target.h > MAX_PIXELS || target.w > 16384 || target.h > 16384) return setErr('Dimensi hasil terlalu besar (maks 16384 px per sisi).');
    try {
      const c = makeCanvas(target.w, target.h);
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak tersedia.');
      if (format === 'image/jpeg') paintWhite(ctx, c.width, c.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(loaded.img, 0, 0, c.width, c.height);
      const b = await toBlob(c, format, 0.92);
      downloadBlob(b, `${baseName(loaded.file.name)}-${target.w}x${target.h}.${EXT[format]}`);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal resize.');
    }
  };

  return (
    <Card>
      {picker(load)}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {loaded ? (
        <>
          <p className="text-sm text-zinc-400">Ukuran asli: {loaded.w}×{loaded.h} px · {formatBytes(loaded.file.size)}</p>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'px', label: 'Piksel' }, { value: 'pct', label: 'Persen' }]} />
          {mode === 'px' ? (
            <>
              <Row>
                <NumField label="Lebar (px)" value={w} onChange={onW} />
                <NumField label="Tinggi (px)" value={h} onChange={onH} />
              </Row>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /> Kunci rasio
              </label>
            </>
          ) : (
            <NumField label="Skala" value={pct} onChange={setPct} suffix="%" />
          )}
          <SelectField label="Format hasil" value={format} onChange={setFormat} options={[{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPG' }, { value: 'image/webp', label: 'WebP' }]} />
          {target ? <p className="text-sm text-zinc-300">Hasil: <span className="font-semibold">{target.w}×{target.h}</span> px</p> : <Notice kind="warn">Isi ukuran yang valid.</Notice>}
          {err ? <Notice kind="error">{err}</Notice> : null}
          <button type="button" className="btn btn-primary" disabled={!target} onClick={run}>Resize & unduh</button>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Crop

const ASPECTS: { value: string; label: string; r: number | null }[] = [
  { value: 'free', label: 'Bebas', r: null },
  { value: '1:1', label: '1:1', r: 1 },
  { value: '4:3', label: '4:3', r: 4 / 3 },
  { value: '16:9', label: '16:9', r: 16 / 9 },
  { value: '3:4', label: '3:4', r: 3 / 4 },
  { value: '9:16', label: '9:16', r: 9 / 16 },
];

function CropImage() {
  const { loaded, error, load } = useImage();
  const [aspect, setAspect] = useState('free');
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [format, setFormat] = useState('image/png');
  const [err, setErr] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (loaded) {
      setX('0');
      setY('0');
      setW(String(loaded.w));
      setH(String(loaded.h));
      setAspect('free');
    }
  }, [loaded]);

  const rect = useMemo(() => {
    if (!loaded) return null;
    const nx = parseNum(x);
    const ny = parseNum(y);
    const nw = parseNum(w);
    const nh = parseNum(h);
    if (nx === null || ny === null || !nw || !nh) return null;
    const rx = Math.min(Math.max(Math.round(nx), 0), loaded.w - 1);
    const ry = Math.min(Math.max(Math.round(ny), 0), loaded.h - 1);
    return { x: rx, y: ry, w: Math.min(Math.max(Math.round(nw), 1), loaded.w - rx), h: Math.min(Math.max(Math.round(nh), 1), loaded.h - ry) };
  }, [loaded, x, y, w, h]);

  const applyAspect = (v: string) => {
    setAspect(v);
    const r = ASPECTS.find((a) => a.value === v)?.r;
    if (!r || !loaded) return;
    let cw = loaded.w;
    let ch = Math.round(cw / r);
    if (ch > loaded.h) {
      ch = loaded.h;
      cw = Math.round(ch * r);
    }
    setW(String(cw));
    setH(String(ch));
    setX(String(Math.round((loaded.w - cw) / 2)));
    setY(String(Math.round((loaded.h - ch) / 2)));
  };

  // pratinjau: gambar + overlay area crop
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !loaded) return;
    const maxW = 640;
    const k = Math.min(1, maxW / loaded.w);
    c.width = Math.round(loaded.w * k);
    c.height = Math.round(loaded.h * k);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(loaded.img, 0, 0, c.width, c.height);
    if (rect) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(loaded.img, rect.x, rect.y, rect.w, rect.h, rect.x * k, rect.y * k, rect.w * k, rect.h * k);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x * k, rect.y * k, rect.w * k, rect.h * k);
    }
  }, [loaded, rect]);

  const run = async () => {
    if (!loaded || !rect) return;
    try {
      const c = makeCanvas(rect.w, rect.h);
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak tersedia.');
      if (format === 'image/jpeg') paintWhite(ctx, c.width, c.height);
      ctx.drawImage(loaded.img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      downloadBlob(await toBlob(c, format, 0.92), `${baseName(loaded.file.name)}-crop.${EXT[format]}`);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal crop.');
    }
  };

  return (
    <Card>
      {picker(load)}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {loaded ? (
        <>
          <p className="text-sm text-zinc-400">Ukuran asli: {loaded.w}×{loaded.h} px</p>
          <canvas ref={canvasRef} className="h-auto max-w-full rounded-xl border border-white/10" aria-label="Pratinjau area crop" />
          <Segmented value={aspect} onChange={applyAspect} label="Rasio" options={ASPECTS.map(({ value, label }) => ({ value, label }))} />
          <Row className="sm:grid-cols-4">
            <NumField label="X (px)" value={x} onChange={(v) => { setX(v); setAspect('free'); }} />
            <NumField label="Y (px)" value={y} onChange={(v) => { setY(v); setAspect('free'); }} />
            <NumField label="Lebar" value={w} onChange={(v) => { setW(v); setAspect('free'); }} />
            <NumField label="Tinggi" value={h} onChange={(v) => { setH(v); setAspect('free'); }} />
          </Row>
          <SelectField label="Format hasil" value={format} onChange={setFormat} options={[{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPG' }, { value: 'image/webp', label: 'WebP' }]} />
          {rect ? <p className="text-sm text-zinc-300">Area: {rect.w}×{rect.h} px</p> : <Notice kind="warn">Isi koordinat yang valid.</Notice>}
          {err ? <Notice kind="error">{err}</Notice> : null}
          <button type="button" className="btn btn-primary" disabled={!rect} onClick={run}>Crop & unduh</button>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Rotate / Flip

function RotateImage() {
  const { loaded, error, load } = useImage();
  const [rot, setRot] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [format, setFormat] = useState('image/png');
  const [err, setErr] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (loaded) {
      setRot(0);
      setFlipH(false);
      setFlipV(false);
    }
  }, [loaded]);

  const render = useCallback(
    (c: HTMLCanvasElement, scale: number) => {
      if (!loaded) return;
      const swap = rot % 180 !== 0;
      const w = Math.max(1, Math.round((swap ? loaded.h : loaded.w) * scale));
      const h = Math.max(1, Math.round((swap ? loaded.w : loaded.h) * scale));
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      if (format === 'image/jpeg') paintWhite(ctx, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(loaded.img, (-loaded.w * scale) / 2, (-loaded.h * scale) / 2, loaded.w * scale, loaded.h * scale);
    },
    [loaded, rot, flipH, flipV, format],
  );

  useEffect(() => {
    if (canvasRef.current && loaded) render(canvasRef.current, Math.min(1, 480 / Math.max(loaded.w, loaded.h)));
  }, [render, loaded]);

  const run = async () => {
    if (!loaded) return;
    try {
      const c = document.createElement('canvas');
      render(c, 1);
      downloadBlob(await toBlob(c, format, 0.92), `${baseName(loaded.file.name)}-edit.${EXT[format]}`);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan.');
    }
  };

  return (
    <Card>
      {picker(load)}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {loaded ? (
        <>
          <canvas ref={canvasRef} className="mx-auto h-auto max-w-full rounded-xl border border-white/10" aria-label="Pratinjau" />
          <Actions>
            <button type="button" className="btn btn-sm" onClick={() => setRot((r) => (r + 270) % 360)}>⟲ 90° kiri</button>
            <button type="button" className="btn btn-sm" onClick={() => setRot((r) => (r + 90) % 360)}>⟳ 90° kanan</button>
            <button type="button" className="btn btn-sm" onClick={() => setRot((r) => (r + 180) % 360)}>180°</button>
            <button type="button" className="btn btn-sm" aria-pressed={flipH} onClick={() => setFlipH((v) => !v)}>Balik horizontal</button>
            <button type="button" className="btn btn-sm" aria-pressed={flipV} onClick={() => setFlipV((v) => !v)}>Balik vertikal</button>
          </Actions>
          <SelectField label="Format hasil" value={format} onChange={setFormat} options={[{ value: 'image/png', label: 'PNG' }, { value: 'image/jpeg', label: 'JPG' }, { value: 'image/webp', label: 'WebP' }]} />
          {err ? <Notice kind="error">{err}</Notice> : null}
          <button type="button" className="btn btn-primary" onClick={run}>Simpan & unduh</button>
        </>
      ) : null}
    </Card>
  );
}

// ─────────────────────────── Konversi format

function Convert({ accept, to, hint }: { accept: string; to: 'image/jpeg' | 'image/png'; hint: string }) {
  const [files, setFiles] = useState<{ name: string; blob: Blob; origSize: number }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [quality, setQuality] = useState(92);

  const run = async (list: File[]) => {
    setBusy(true);
    setErrors([]);
    const ok: typeof files = [];
    const bad: string[] = [];
    for (const f of list.slice(0, 30)) {
      try {
        const l = await readImage(f);
        const c = makeCanvas(l.w, l.h);
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia.');
        if (to === 'image/jpeg') paintWhite(ctx, c.width, c.height);
        ctx.drawImage(l.img, 0, 0);
        URL.revokeObjectURL(l.url);
        let nm = `${baseName(f.name)}.${EXT[to]}`;
        for (let i = 2; ok.some((x) => x.name === nm); i++) nm = `${baseName(f.name)}-${i}.${EXT[to]}`;
        ok.push({ name: nm, blob: await toBlob(c, to, quality / 100), origSize: f.size });
      } catch (e) {
        bad.push(`${f.name}: ${e instanceof Error ? e.message : 'gagal'}`);
      }
    }
    if (list.length > 30) bad.push('Hanya 30 file pertama yang diproses.');
    setFiles(ok);
    setErrors(bad);
    setBusy(false);
  };

  return (
    <Card>
      <FileDrop accept={accept} multiple onFiles={run} label="Pilih gambar (boleh banyak)" hint={hint} />
      {to === 'image/jpeg' ? (
        <label className="block">
          <span className="label">Kualitas JPG: {quality}%</span>
          <input type="range" min={30} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
        </label>
      ) : null}
      {busy ? <Notice>Memproses…</Notice> : null}
      {errors.map((e) => <Notice key={e} kind="error">{e}</Notice>)}
      {files.length ? (
        <>
          <KeyValue rows={files.map((f) => [f.name, `${formatBytes(f.origSize)} → ${formatBytes(f.blob.size)}`])} />
          <Actions>
            {files.map((f) => <DownloadButton key={f.name} primary={files.length === 1} label={files.length === 1 ? 'Unduh' : f.name} onClick={() => downloadBlob(f.blob, f.name)} />)}
          </Actions>
        </>
      ) : null}
      {to === 'image/jpeg' ? <p className="text-xs text-zinc-500">Area transparan akan diisi putih karena JPG tidak mendukung transparansi.</p> : null}
    </Card>
  );
}

// ─────────────────────────── Image → PDF

interface PdfImg {
  id: number;
  file: File;
}

async function imageBytesForPdf(file: File): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' }> {
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: file.type === 'image/png' ? 'png' : 'jpg' };
  }
  const l = await readImage(file);
  try {
    const c = makeCanvas(l.w, l.h);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak tersedia.');
    ctx.drawImage(l.img, 0, 0);
    const b = await toBlob(c, 'image/png');
    return { bytes: new Uint8Array(await b.arrayBuffer()), kind: 'png' };
  } finally {
    URL.revokeObjectURL(l.url);
  }
}

const PAGE: Record<string, [number, number] | null> = { a4: [595.28, 841.89], letter: [612, 792], fit: null };

function ImageToPdf() {
  const [items, setItems] = useState<PdfImg[]>([]);
  const [size, setSize] = useState('a4');
  const [margin, setMargin] = useState('24');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useRef(1);

  const move = (i: number, d: number) =>
    setItems((a) => {
      const j = i + d;
      if (j < 0 || j >= a.length) return a;
      const b = a.slice();
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });

  const build = async () => {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      const m = Math.max(0, parseNum(margin) ?? 0);
      for (const it of items) {
        const { bytes, kind } = await imageBytesForPdf(it.file);
        const img = kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const dims = PAGE[size];
        if (!dims) {
          const page = pdf.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        } else {
          const [pw, ph] = img.width > img.height ? [dims[1], dims[0]] : dims;
          const page = pdf.addPage([pw, ph]);
          const k = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height, 1e9);
          const dw = img.width * k;
          const dh = img.height * k;
          page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
        }
      }
      const out = await pdf.save();
      downloadBlob(new Blob([out as BlobPart], { type: 'application/pdf' }), 'gambar.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <FileDrop accept="image/*" multiple onFiles={(f) => setItems((a) => [...a, ...f.map((file) => ({ id: id.current++, file }))].slice(0, 100))} label="Tambah gambar" hint="JPG, PNG, atau format lain yang didukung browser. Maks 100." />
      {items.length ? (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07]">
          {items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-6 text-zinc-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-zinc-200">{it.file.name}</span>
              <span className="hidden text-xs text-zinc-500 sm:block">{formatBytes(it.file.size)}</span>
              <button type="button" className="btn btn-sm !px-2" aria-label="Naik" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} aria-hidden /></button>
              <button type="button" className="btn btn-sm !px-2" aria-label="Turun" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} aria-hidden /></button>
              <button type="button" className="btn btn-sm !px-2" aria-label="Hapus" onClick={() => setItems((a) => a.filter((x) => x.id !== it.id))}><Trash2 size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <Row>
        <SelectField label="Ukuran halaman" value={size} onChange={setSize} options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'fit', label: 'Sesuai ukuran gambar' }]} />
        {size !== 'fit' ? <NumField label="Margin (pt)" value={margin} onChange={setMargin} /> : null}
      </Row>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="button" className="btn btn-primary" disabled={!items.length || busy} onClick={build}>{busy ? 'Membuat PDF…' : 'Buat PDF'}</button>
    </Card>
  );
}

// ─────────────────────────── PDF helpers

async function readPdf(file: File) {
  if (file.size > MAX_PDF_BYTES) throw new Error(`Ukuran PDF maks ${formatBytes(MAX_PDF_BYTES)}.`);
  const { PDFDocument } = await import('pdf-lib');
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return await PDFDocument.load(bytes);
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(e.message)) throw new Error(`${file.name}: PDF terenkripsi/dikunci password tidak didukung.`);
    throw new Error(`${file.name}: bukan PDF yang valid atau file rusak.`);
  }
}

/** "1-3, 5, 8-" → indeks halaman (0-based), terurut sesuai input. Melempar Error bila tidak valid. */
export function parsePageRanges(input: string, total: number): number[] {
  const out: number[] = [];
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Isi rentang halaman, mis. 1-3, 5, 8-');
  for (const p of parts) {
    const m = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(p);
    if (!m || (!m[1] && !m[3])) throw new Error(`Rentang tidak valid: “${p}”.`);
    if (!m[2] && m[3]) throw new Error(`Rentang tidak valid: “${p}” (pisahkan dengan koma).`);
    let a: number;
    let b: number;
    if (!m[2]) {
      a = b = Number(m[1]);
    } else {
      a = m[1] ? Number(m[1]) : 1;
      b = m[3] ? Number(m[3]) : total;
    }
    if (a < 1 || b < 1 || a > total || b > total) throw new Error(`Halaman di luar jangkauan (1–${total}): “${p}”.`);
    if (a > b) throw new Error(`Rentang terbalik: “${p}”.`);
    for (let i = a; i <= b; i++) out.push(i - 1);
  }
  return out;
}

// ─────────────────────────── Merge PDF

function MergePdf() {
  const [items, setItems] = useState<{ id: number; file: File }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useRef(1);

  const move = (i: number, d: number) =>
    setItems((a) => {
      const j = i + d;
      if (j < 0 || j >= a.length) return a;
      const b = a.slice();
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });

  const merge = async () => {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const out = await PDFDocument.create();
      for (const it of items) {
        const src = await readPdf(it.file);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      downloadBlob(new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }), 'gabungan.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menggabungkan PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <FileDrop accept="application/pdf,.pdf" multiple onFiles={(f) => setItems((a) => [...a, ...f.map((file) => ({ id: id.current++, file }))].slice(0, 50))} label="Tambah PDF" hint="Urutan di daftar = urutan di hasil." />
      {items.length ? (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07]">
          {items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-6 text-zinc-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-zinc-200">{it.file.name}</span>
              <span className="text-xs text-zinc-500">{formatBytes(it.file.size)}</span>
              <button type="button" className="btn btn-sm !px-2" aria-label="Naik" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} aria-hidden /></button>
              <button type="button" className="btn btn-sm !px-2" aria-label="Turun" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} aria-hidden /></button>
              <button type="button" className="btn btn-sm !px-2" aria-label="Hapus" onClick={() => setItems((a) => a.filter((x) => x.id !== it.id))}><Trash2 size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="button" className="btn btn-primary" disabled={items.length < 2 || busy} onClick={merge}>{busy ? 'Menggabungkan…' : 'Gabungkan PDF'}</button>
      {items.length === 1 ? <p className="text-xs text-zinc-500">Tambahkan minimal 2 PDF.</p> : null}
    </Card>
  );
}

// ─────────────────────────── Split PDF

function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [ranges, setRanges] = useState('');
  const [mode, setMode] = useState<'extract' | 'each'>('extract');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File[]) => {
    try {
      const doc = await readPdf(f[0]);
      setFile(f[0]);
      setPages(doc.getPageCount());
      setRanges('');
      setError('');
    } catch (e) {
      setFile(null);
      setPages(0);
      setError(e instanceof Error ? e.message : 'Gagal membaca PDF.');
    }
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const src = await readPdf(file);
      const name = baseName(file.name);
      if (mode === 'extract') {
        const idx = parsePageRanges(ranges, src.getPageCount());
        const out = await PDFDocument.create();
        (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
        downloadBlob(new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }), `${name}-halaman.pdf`);
      } else {
        if (src.getPageCount() > 50) throw new Error('Mode “satu file per halaman” dibatasi 50 halaman (browser memblokir banyak unduhan sekaligus).');
        for (let i = 0; i < src.getPageCount(); i++) {
          const out = await PDFDocument.create();
          const [p] = await out.copyPages(src, [i]);
          out.addPage(p);
          downloadBlob(new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }), `${name}-${i + 1}.pdf`);
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memproses PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <FileDrop accept="application/pdf,.pdf" onFiles={onFile} label="Pilih PDF" />
      {file ? (
        <>
          <p className="text-sm text-zinc-400">{file.name} · {pages} halaman · {formatBytes(file.size)}</p>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'extract', label: 'Ambil halaman' }, { value: 'each', label: 'Satu file per halaman' }]} />
          {mode === 'extract' ? <TextField label="Halaman" value={ranges} onChange={setRanges} placeholder="1-3, 5, 8-" hint={`Pisahkan dengan koma. Total ${pages} halaman. “8-” berarti sampai akhir.`} mono /> : null}
        </>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={run}>{busy ? 'Memproses…' : mode === 'extract' ? 'Ambil & unduh' : 'Pisah & unduh'}</button>
    </Card>
  );
}

const tools: Record<string, ComponentType> = {
  'compress-image': CompressImage,
  'resize-image': ResizeImage,
  'crop-image': CropImage,
  'rotate-image': RotateImage,
  'jpg-to-png': () => <Convert accept="image/jpeg,.jpg,.jpeg" to="image/png" hint="Menerima JPG/JPEG." />,
  'png-to-jpg': () => <Convert accept="image/png,.png" to="image/jpeg" hint="Menerima PNG." />,
  'webp-to-jpg': () => <Convert accept="image/webp,.webp" to="image/jpeg" hint="Menerima WebP." />,
  'image-to-pdf': ImageToPdf,
  'merge-pdf': MergePdf,
  'split-pdf': SplitPdf,
};

export default tools;
