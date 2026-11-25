'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { parseUserAgent } from '@/lib/ua';
import { formatBytes } from '@/lib/utils';
import { Actions, Card, CopyButton, KeyValue, Notice, Stat, StatGrid } from '@/components/tools/ui';

const UNSUPPORTED = 'Tidak didukung browser ini';

// ─────────────────────────── Info Baterai

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

const fmtSecs = (s: number) => {
  if (!Number.isFinite(s)) return 'Tidak diketahui';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h} j ${m} m`;
};

function BatteryInfo() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'error' | 'ok'>('loading');
  const [b, setB] = useState<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number } | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== 'function') return setState('unsupported');
    let mgr: BatteryManagerLike | null = null;
    let alive = true;
    const sync = () => {
      if (!mgr || !alive) return;
      setB({ level: mgr.level, charging: mgr.charging, chargingTime: mgr.chargingTime, dischargingTime: mgr.dischargingTime });
    };
    nav
      .getBattery()
      .then((m) => {
        if (!alive) return;
        mgr = m;
        ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((e) => m.addEventListener(e, sync));
        sync();
        setState('ok');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
      if (mgr) ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((e) => mgr?.removeEventListener(e, sync));
    };
  }, []);

  if (state === 'loading') return <Card><Notice>Membaca baterai…</Notice></Card>;
  if (state === 'unsupported')
    return (
      <Card>
        <Notice kind="warn">Battery API tidak didukung browser ini (Safari/iOS dan Firefox tidak menyediakannya). Detail baterai lengkap tersedia di aplikasi Android.</Notice>
      </Card>
    );
  if (state === 'error' || !b) return <Card><Notice kind="error">Gagal membaca info baterai.</Notice></Card>;
  const pct = Math.round(b.level * 100);
  return (
    <Card>
      <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Level baterai">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <StatGrid cols={3}>
        <Stat label="Level" value={`${pct}%`} accent />
        <Stat label="Status" value={b.charging ? 'Mengisi' : 'Tidak mengisi'} />
        <Stat label={b.charging ? 'Penuh dalam' : 'Habis dalam'} value={fmtSecs(b.charging ? b.chargingTime : b.dischargingTime)} />
      </StatGrid>
      <p className="text-xs text-zinc-500">Kesehatan & suhu baterai tidak tersedia lewat browser.</p>
    </Card>
  );
}

// ─────────────────────────── Info RAM

function RamInfo() {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
  const perf = typeof performance !== 'undefined' ? (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }) : null;
  const [heap, setHeap] = useState(perf?.memory ? { used: perf.memory.usedJSHeapSize, total: perf.memory.totalJSHeapSize, limit: perf.memory.jsHeapSizeLimit } : null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => {
      const m = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (m) setHeap({ used: m.usedJSHeapSize, total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit });
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) return <Card><Notice>Membaca…</Notice></Card>;
  const dm = nav?.deviceMemory;
  return (
    <Card>
      <KeyValue
        rows={[
          ['Perkiraan RAM perangkat', dm ? `≈ ${dm} GB` : UNSUPPORTED],
          ['Heap JS terpakai', heap ? formatBytes(heap.used) : UNSUPPORTED],
          ['Heap JS dialokasikan', heap ? formatBytes(heap.total) : UNSUPPORTED],
          ['Batas heap JS', heap ? formatBytes(heap.limit) : UNSUPPORTED],
        ]}
      />
      <Notice>Browser sengaja membulatkan RAM (maks 8 GB) dan tidak membuka pemakaian RAM sistem. Angka heap hanya milik tab ini. Info RAM sebenarnya tersedia di aplikasi Android.</Notice>
    </Card>
  );
}

// ─────────────────────────── Info Storage

function StorageInfo() {
  const [est, setEst] = useState<{ usage?: number; quota?: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [state, setState] = useState<'loading' | 'unsupported' | 'ok' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!navigator.storage?.estimate) return setState('unsupported');
    try {
      setEst(await navigator.storage.estimate());
      if (navigator.storage.persisted) setPersisted(await navigator.storage.persisted());
      setState('ok');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') return <Card><Notice>Membaca…</Notice></Card>;
  if (state === 'unsupported') return <Card><Notice kind="warn">Storage Estimate API tidak didukung browser ini.</Notice></Card>;
  if (state === 'error' || !est) return <Card><Notice kind="error">Gagal membaca info storage.</Notice></Card>;
  const pct = est.quota ? ((est.usage ?? 0) / est.quota) * 100 : null;
  return (
    <Card>
      <StatGrid cols={3}>
        <Stat label="Terpakai (situs ini)" value={formatBytes(est.usage ?? 0)} accent />
        <Stat label="Kuota browser" value={est.quota ? formatBytes(est.quota) : '—'} />
        <Stat label="Persentase" value={pct === null ? '—' : `${pct < 0.01 ? '<0.01' : pct.toFixed(2)}%`} />
      </StatGrid>
      <KeyValue rows={[['Penyimpanan persisten', persisted === null ? UNSUPPORTED : persisted ? 'Ya' : 'Tidak']]} />
      <Actions>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>Segarkan</button>
      </Actions>
      <Notice>Ini kuota yang diberikan browser untuk situs ini — <strong>bukan</strong> sisa memori internal HP. Info storage perangkat sebenarnya tersedia di aplikasi Android.</Notice>
    </Card>
  );
}

// ─────────────────────────── Info Browser

function BrowserInfo() {
  const [info, setInfo] = useState<[string, string][] | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const p = parseUserAgent(ua);
    const yn = (v: boolean) => (v ? 'Ya' : 'Tidak');
    setInfo([
      ['Browser', p.browser ? `${p.browser.name} ${p.browser.version}` : 'Tidak dikenali'],
      ['Mesin render', p.engine ? `${p.engine.name} ${p.engine.version}` : 'Tidak dikenali'],
      ['Sistem operasi (dari UA)', p.os ? `${p.os.name} ${p.os.version}`.trim() : 'Tidak dikenali'],
      ['Bahasa', navigator.language],
      ['Daftar bahasa', (navigator.languages ?? []).join(', ') || '—'],
      ['Zona waktu', Intl.DateTimeFormat().resolvedOptions().timeZone],
      ['Cookie aktif', yn(navigator.cookieEnabled)],
      ['Do Not Track', navigator.doNotTrack === '1' ? 'Aktif' : 'Tidak aktif / tidak dilaporkan'],
      ['Service Worker', yn('serviceWorker' in navigator)],
      ['WebGL', yn(!!document.createElement('canvas').getContext('webgl'))],
      ['WebAssembly', yn(typeof WebAssembly === 'object')],
      ['Clipboard API', yn(!!navigator.clipboard)],
      ['Konteks aman (HTTPS)', yn(window.isSecureContext)],
      ['User agent', ua],
    ]);
  }, []);
  if (!info) return <Card><Notice>Membaca…</Notice></Card>;
  return (
    <Card>
      <KeyValue rows={info} />
      <CopyButton text={info.map(([k, v]) => `${k}: ${v}`).join('\n')} label="Salin semua" />
    </Card>
  );
}

// ─────────────────────────── Info Layar

function ScreenInfo() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  useEffect(() => {
    const read = () => {
      const s = window.screen;
      const dpr = window.devicePixelRatio || 1;
      const orient = s.orientation?.type ?? (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      setRows([
        ['Resolusi layar (CSS px)', `${s.width} × ${s.height}`],
        ['Perkiraan piksel fisik', `${Math.round(s.width * dpr)} × ${Math.round(s.height * dpr)}`],
        ['Area jendela', `${window.innerWidth} × ${window.innerHeight}`],
        ['Device pixel ratio', String(dpr)],
        ['Kedalaman warna', `${s.colorDepth}-bit`],
        ['Orientasi', orient],
        ['Layar sentuh', navigator.maxTouchPoints > 0 ? `Ya (${navigator.maxTouchPoints} titik)` : 'Tidak'],
        ['Mode gelap sistem', matchMedia('(prefers-color-scheme: dark)').matches ? 'Ya' : 'Tidak'],
        ['Kurangi animasi', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Ya' : 'Tidak'],
        ['Refresh rate', 'Tidak tersedia lewat browser'],
      ]);
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  if (!rows) return <Card><Notice>Membaca…</Notice></Card>;
  return (
    <Card>
      <KeyValue rows={rows} />
      <p className="text-xs text-zinc-500">Piksel fisik adalah perkiraan (resolusi CSS × DPR); bisa meleset bila browser di-zoom.</p>
    </Card>
  );
}

// ─────────────────────────── Info Jaringan

interface ConnLike extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

function NetworkInfo() {
  const [online, setOnline] = useState(true);
  const [conn, setConn] = useState<ConnLike | null | undefined>(undefined);
  const [, tick] = useState(0);

  useEffect(() => {
    const c = (navigator as Navigator & { connection?: ConnLike }).connection ?? null;
    setConn(c);
    setOnline(navigator.onLine);
    const up = () => setOnline(navigator.onLine);
    const ch = () => tick((n) => n + 1);
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    c?.addEventListener('change', ch);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', up);
      c?.removeEventListener('change', ch);
    };
  }, []);

  if (conn === undefined) return <Card><Notice>Membaca…</Notice></Card>;
  return (
    <Card>
      <KeyValue
        rows={[
          ['Status', online ? 'Online' : 'Offline'],
          ['Tipe koneksi (perkiraan)', conn?.effectiveType ? conn.effectiveType.toUpperCase() : UNSUPPORTED],
          ['Perkiraan bandwidth', conn?.downlink !== undefined ? `${conn.downlink} Mbps` : UNSUPPORTED],
          ['Perkiraan RTT', conn?.rtt !== undefined ? `${conn.rtt} ms` : UNSUPPORTED],
          ['Mode hemat data', conn?.saveData === undefined ? UNSUPPORTED : conn.saveData ? 'Aktif' : 'Tidak aktif'],
          ['Jenis jaringan (Wi-Fi/seluler)', conn?.type ?? 'Tidak dibuka oleh browser'],
        ]}
      />
      {!conn ? <Notice kind="warn">Network Information API tidak didukung browser ini (umumnya hanya Chrome/Edge/Android). Info sinyal, operator, dan SSID tersedia di aplikasi Android.</Notice> : <Notice>Nilai bersifat perkiraan dari browser, bukan hasil speed test.</Notice>}
    </Card>
  );
}

// ─────────────────────────── Status Koneksi (ping ke server ToolsPhone)

function ConnectionStatus() {
  const [samples, setSamples] = useState<number[]>([]);
  const [fails, setFails] = useState(0);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  const run = async () => {
    setRunning(true);
    stop.current = false;
    setSamples([]);
    setFails(0);
    for (let i = 0; i < 10 && !stop.current; i++) {
      const t0 = performance.now();
      try {
        const ctrl = new AbortController();
        const to = window.setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`/api/ping?t=${Date.now()}-${i}`, { cache: 'no-store', signal: ctrl.signal });
        window.clearTimeout(to);
        if (!res.ok && res.status !== 204) throw new Error('bad');
        setSamples((s) => [...s, performance.now() - t0]);
      } catch {
        setFails((f) => f + 1);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setRunning(false);
  };

  useEffect(() => () => { stop.current = true; }, []);

  const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  const min = samples.length ? Math.min(...samples) : null;
  const max = samples.length ? Math.max(...samples) : null;
  const jitter = samples.length > 1 ? samples.slice(1).reduce((a, v, i) => a + Math.abs(v - samples[i]), 0) / (samples.length - 1) : null;
  const total = samples.length + fails;
  const f = (n: number | null) => (n === null ? '—' : `${n.toFixed(0)} ms`);

  return (
    <Card>
      <Actions>
        <button type="button" className="btn btn-primary" disabled={running} onClick={run}>{running ? 'Mengukur…' : 'Mulai tes (10 ping)'}</button>
        {running ? <button type="button" className="btn" onClick={() => { stop.current = true; }}>Berhenti</button> : null}
      </Actions>
      {total > 0 ? (
        <StatGrid cols={4}>
          <Stat label="Rata-rata" value={f(avg)} accent />
          <Stat label="Min / Maks" value={`${f(min)} / ${f(max)}`} />
          <Stat label="Jitter" value={f(jitter)} />
          <Stat label="Gagal" value={`${fails} / ${total}`} />
        </StatGrid>
      ) : (
        <Notice>Mengukur waktu bolak-balik dari perangkatmu ke server ToolsPhone.</Notice>
      )}
      {fails > 0 && samples.length === 0 && total >= 3 ? <Notice kind="error">Server tidak terjangkau. Periksa koneksi internetmu.</Notice> : null}
      <p className="text-xs text-zinc-500">Ini latensi ke server ToolsPhone, bukan kecepatan unduh/unggah, dan sudah termasuk overhead HTTP.</p>
    </Card>
  );
}

// ─────────────────────────── Info Perangkat

function DeviceInfo() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      userAgentData?: { platform?: string; mobile?: boolean; brands?: { brand: string; version: string }[]; getHighEntropyValues?: (h: string[]) => Promise<Record<string, string>> };
    };
    const p = parseUserAgent(nav.userAgent);
    const base: [string, string][] = [
      ['Jenis perangkat (dari UA)', p.device.type],
      ['Merek / model (dari UA)', [p.device.vendor, p.device.model].filter(Boolean).join(' ') || 'Tidak dilaporkan browser'],
      ['Platform', nav.userAgentData?.platform ?? nav.platform ?? 'Tidak diketahui'],
      ['Sistem operasi', p.os ? `${p.os.name} ${p.os.version}`.trim() : 'Tidak dikenali'],
      ['Jumlah core logika CPU', nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : UNSUPPORTED],
      ['Perkiraan RAM', nav.deviceMemory ? `≈ ${nav.deviceMemory} GB` : UNSUPPORTED],
      ['Layar', `${screen.width} × ${screen.height} @${window.devicePixelRatio}x`],
      ['Layar sentuh', nav.maxTouchPoints > 0 ? 'Ya' : 'Tidak'],
      ['Bahasa', nav.language],
    ];
    setRows(base);
    nav.userAgentData?.getHighEntropyValues?.(['model', 'platformVersion'])
      .then((v) => {
        setRows((r) => {
          if (!r) return r;
          const out = r.map((x) => [...x] as [string, string]);
          if (v.model) out[1] = ['Merek / model (dari UA)', v.model];
          if (v.platformVersion) out[3] = ['Sistem operasi', `${p.os?.name ?? nav.userAgentData?.platform ?? ''} ${v.platformVersion}`.trim()];
          return out;
        });
      })
      .catch(() => undefined);
  }, []);
  if (!rows) return <Card><Notice>Membaca…</Notice></Card>;
  return (
    <Card>
      <KeyValue rows={rows} />
      <CopyButton text={rows.map(([k, v]) => `${k}: ${v}`).join('\n')} label="Salin semua" />
      <Notice>Browser membatasi data hardware demi privasi. Info CPU detail, sensor, SIM, dan aplikasi terpasang tersedia di aplikasi Android.</Notice>
    </Card>
  );
}

// ─────────────────────────── Online / Offline

function OnlineStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [log, setLog] = useState<{ at: Date; online: boolean }[]>([]);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      setLog((l) => [{ at: new Date(), online: true }, ...l].slice(0, 20));
    };
    const down = () => {
      setOnline(false);
      setLog((l) => [{ at: new Date(), online: false }, ...l].slice(0, 20));
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (online === null) return <Card><Notice>Membaca…</Notice></Card>;
  return (
    <Card>
      <div className="flex flex-col items-center gap-2 py-4" role="status" aria-live="polite">
        <span className={`h-4 w-4 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_18px_rgb(52_211_153)]' : 'bg-red-500 shadow-[0_0_18px_rgb(239_68_68)]'}`} aria-hidden />
        <p className="font-heading text-3xl font-semibold text-zinc-50">{online ? 'Online' : 'Offline'}</p>
      </div>
      {log.length ? (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] text-sm">
          {log.map((e, i) => (
            <li key={i} className="flex justify-between px-3 py-2">
              <span className={e.online ? 'text-emerald-300' : 'text-red-300'}>{e.online ? 'Kembali online' : 'Terputus'}</span>
              <span className="text-zinc-500">{e.at.toLocaleTimeString('id-ID')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-xs text-zinc-500">Perubahan status akan dicatat di sini selama halaman terbuka.</p>
      )}
      <p className="text-xs text-zinc-500">Status berasal dari browser: “online” berarti ada koneksi jaringan, belum tentu internet berfungsi. Gunakan “Status Koneksi” untuk menguji server.</p>
    </Card>
  );
}

const tools: Record<string, ComponentType> = {
  'battery-info': BatteryInfo,
  'ram-info': RamInfo,
  'storage-info': StorageInfo,
  'browser-info': BrowserInfo,
  'screen-info': ScreenInfo,
  'network-info': NetworkInfo,
  'connection-status': ConnectionStatus,
  'device-info': DeviceInfo,
  'online-status': OnlineStatus,
};

export default tools;
