'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { Loader, Search } from 'lucide-react';
import {
  ipv4Info, ipv4InCidr, ipv6Info, parseIPv4, parseIPv6, parsePrefixOrMask, rangeToCidrs, splitIPv4,
} from '@/lib/ip';
import { parseUserAgent } from '@/lib/ua';
import { formatDateTime } from '@/lib/utils';
import {
  Actions, Card, CopyButton, KeyValue, Notice, NumField, Output, Row, Segmented, SelectField, Stat, StatGrid,
  TextField, parseNum,
} from '@/components/tools/ui';
import { cn } from '@/lib/utils';

// ───────────────────────────── helper fetch API

interface ApiState<T> {
  data: T | null;
  error: string;
  loading: boolean;
}

function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: '', loading: false });
  const run = useCallback(async (url: string) => {
    setState({ data: null, error: '', loading: true });
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
      if (!body) throw new Error('Respons server tidak valid.');
      if (!res.ok || (body as { ok?: boolean }).ok === false) {
        setState({ data: null, error: body.error ?? `Permintaan gagal (${res.status}).`, loading: false });
        return null;
      }
      setState({ data: body, error: '', loading: false });
      return body;
    } catch (e) {
      setState({ data: null, error: e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Tidak dapat menghubungi server. Periksa koneksi internetmu.', loading: false });
      return null;
    }
  }, []);
  return { ...state, run };
}

function Busy({ label = 'Memproses…' }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
      <Loader size={15} className="animate-spin" aria-hidden /> {label}
    </p>
  );
}

// ───────────────────────────── IP Checker

interface IpResp {
  ip: string;
  version: number;
  self: boolean;
  scope: 'public' | 'non-public';
  note?: string;
  geo: null | {
    country: string | null; countryCode: string | null; region: string | null; city: string | null;
    latitude: number | null; longitude: number | null; timezone: string | null; isp: string | null; org: string | null; asn: number | null;
  };
  source?: string | null;
  error?: string;
}

function IpChecker() {
  const api = useApi<IpResp>();
  const [other, setOther] = useState('');
  const { run } = api;

  useEffect(() => {
    void run('/api/network/ip');
  }, [run]);

  const d = api.data;
  const g = d?.geo;
  const place = g ? [g.city, g.region, g.country].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-4">
      <Card title={d && !d.self ? 'Hasil pencarian' : 'IP publikmu'}>
        {api.loading ? <Busy label="Mendeteksi IP…" /> : null}
        {api.error ? <Notice kind="error">{api.error}</Notice> : null}
        {d?.error ? <Notice kind="warn">{d.error}</Notice> : null}
        {d && !d.error ? (
          <>
            <div className="inset flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">IPv{d.version}</p>
                <p className="break-all font-heading text-2xl font-semibold text-zinc-50">{d.ip}</p>
              </div>
              <CopyButton text={d.ip} />
            </div>
            {d.note ? <Notice kind="info">{d.note}</Notice> : null}
            {g ? (
              <>
                <KeyValue
                  rows={[
                    ['Lokasi (perkiraan)', place || '—'],
                    ['Zona waktu', g.timezone ?? '—'],
                    ['ISP', g.isp ?? '—'],
                    ['Organisasi', g.org ?? '—'],
                    ['ASN', g.asn ? `AS${g.asn}` : '—'],
                    ['Koordinat (perkiraan)', g.latitude !== null && g.longitude !== null ? `${g.latitude}, ${g.longitude}` : '—'],
                  ]}
                />
                <p className="text-xs text-zinc-500">
                  Lokasi diperkirakan dari alamat IP dan sering hanya akurat sampai tingkat kota/wilayah. Sumber data: {d.source}.
                </p>
              </>
            ) : d.scope === 'public' ? (
              <Notice kind="warn">Info lokasi/ISP tidak dapat diambil saat ini. Alamat IP di atas tetap valid.</Notice>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card title="Cek IP lain">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (other.trim()) void run(`/api/network/ip?ip=${encodeURIComponent(other.trim())}`);
          }}
        >
          <TextField className="flex-1" label="Alamat IP" value={other} onChange={setOther} placeholder="mis. 8.8.8.8 atau 2001:4860:4860::8888" mono />
          <button type="submit" className="btn btn-primary" disabled={api.loading || !other.trim()}>
            <Search size={16} aria-hidden /> Cek
          </button>
        </form>
        {d && !d.self ? (
          <button type="button" className="btn btn-sm" onClick={() => void run('/api/network/ip')}>Kembali ke IP-ku</button>
        ) : null}
      </Card>
    </div>
  );
}

// ───────────────────────────── IPv4 / CIDR / Subnet

function ipv4Rows(i: ReturnType<typeof ipv4Info>): [string, string][] {
  return [
    ['Alamat IP', i.ip],
    ['Netmask', `${i.mask}  (/${i.prefix})`],
    ['Wildcard mask', i.wildcard],
    ['Alamat jaringan', i.network],
    ['Broadcast', i.broadcast],
    ['Host pertama', i.firstHost],
    ['Host terakhir', i.lastHost],
    ['Total alamat', i.totalAddresses.toLocaleString('id-ID')],
    ['Host yang bisa dipakai', i.usableHosts.toLocaleString('id-ID')],
    ['Kelas', i.ipClass],
    ['Jenis', i.kind],
    ['IP (biner)', i.binaryIp],
    ['Mask (biner)', i.binaryMask],
  ];
}

function Ipv4Calculator() {
  const [ip, setIp] = useState('192.168.1.10');
  const [mask, setMask] = useState('24');
  const res = useMemo(() => {
    const n = parseIPv4(ip);
    if (n === null) return { error: ip.trim() ? 'Alamat IPv4 tidak valid (contoh: 192.168.1.10).' : '' };
    const p = parsePrefixOrMask(mask);
    if (p === null) return { error: 'Prefix harus 0–32 atau subnet mask yang valid (mis. 255.255.255.0).' };
    return { info: ipv4Info(n, p) };
  }, [ip, mask]);
  return (
    <Card>
      <Row>
        <TextField label="Alamat IPv4" value={ip} onChange={setIp} inputMode="decimal" placeholder="192.168.1.10" mono />
        <TextField label="Prefix / subnet mask" value={mask} onChange={setMask} placeholder="24 atau 255.255.255.0" mono />
      </Row>
      {res.error ? <Notice kind="error">{res.error}</Notice> : null}
      {res.info ? <KeyValue rows={ipv4Rows(res.info)} /> : null}
    </Card>
  );
}

function CidrCalculator() {
  const [cidr, setCidr] = useState('192.168.0.0/22');
  const [test, setTest] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const parsed = useMemo(() => {
    const m = /^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(cidr);
    if (!m) return { error: cidr.trim() ? 'Format harus seperti 192.168.0.0/24.' : '' };
    const n = parseIPv4(m[1]);
    const p = Number(m[2]);
    if (n === null || p > 32) return { error: 'Alamat atau prefix tidak valid.' };
    return { n, p, info: ipv4Info(n, p) };
  }, [cidr]);

  const inside = useMemo(() => {
    if (!parsed.info || !test.trim()) return null;
    const t = parseIPv4(test);
    if (t === null) return 'invalid' as const;
    return ipv4InCidr(t, parsed.n!, parsed.p!) ? ('in' as const) : ('out' as const);
  }, [parsed, test]);

  const range = useMemo(() => {
    if (!from.trim() || !to.trim()) return null;
    const a = parseIPv4(from);
    const b = parseIPv4(to);
    if (a === null || b === null) return { error: 'Alamat awal/akhir tidak valid.' };
    if (a > b) return { error: 'Alamat awal harus lebih kecil dari alamat akhir.' };
    return { list: rangeToCidrs(a, b) };
  }, [from, to]);

  return (
    <div className="space-y-4">
      <Card title="Hitung blok CIDR">
        <TextField label="CIDR" value={cidr} onChange={setCidr} placeholder="192.168.0.0/24" mono />
        {parsed.error ? <Notice kind="error">{parsed.error}</Notice> : null}
        {parsed.info ? (
          <>
            {parsed.info.ip !== parsed.info.network ? (
              <Notice kind="info">Alamat yang kamu masukkan bukan alamat jaringan. Blok yang benar adalah <strong>{parsed.info.network}/{parsed.info.prefix}</strong>.</Notice>
            ) : null}
            <KeyValue
              rows={[
                ['Blok jaringan', `${parsed.info.network}/${parsed.info.prefix}`],
                ['Rentang alamat', `${parsed.info.network} – ${parsed.info.broadcast}`],
                ['Rentang host', `${parsed.info.firstHost} – ${parsed.info.lastHost}`],
                ['Netmask', parsed.info.mask],
                ['Total alamat', parsed.info.totalAddresses.toLocaleString('id-ID')],
                ['Host yang bisa dipakai', parsed.info.usableHosts.toLocaleString('id-ID')],
              ]}
            />
            <TextField label="Cek apakah IP berada di blok ini" value={test} onChange={setTest} placeholder="192.168.1.77" mono />
            {inside === 'in' ? <Notice kind="success">{test.trim()} berada di dalam blok ini.</Notice> : null}
            {inside === 'out' ? <Notice kind="warn">{test.trim()} berada di luar blok ini.</Notice> : null}
            {inside === 'invalid' ? <Notice kind="error">Alamat IP tidak valid.</Notice> : null}
          </>
        ) : null}
      </Card>

      <Card title="Rentang IP → CIDR">
        <Row>
          <TextField label="IP awal" value={from} onChange={setFrom} placeholder="10.0.0.1" mono />
          <TextField label="IP akhir" value={to} onChange={setTo} placeholder="10.0.3.200" mono />
        </Row>
        {range && 'error' in range ? <Notice kind="error">{range.error}</Notice> : null}
        {range && 'list' in range ? (
          <Output label={`${(range.list ?? []).length} blok CIDR (paling ringkas)`} value={(range.list ?? []).map((x) => x.cidr).join('\n')} rows={Math.min(10, (range.list ?? []).length + 1)} />
        ) : null}
      </Card>
    </div>
  );
}

function SubnetCalculator() {
  const [net, setNet] = useState('192.168.10.0/24');
  const [mode, setMode] = useState<'prefix' | 'count' | 'hosts'>('count');
  const [val, setVal] = useState('4');

  const res = useMemo(() => {
    const m = /^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(net);
    if (!m) return { error: 'Jaringan harus berformat 192.168.10.0/24.' };
    const ip = parseIPv4(m[1]);
    const p = Number(m[2]);
    if (ip === null || p > 30) return { error: 'Alamat tidak valid atau prefix lebih dari /30.' };
    const v = parseNum(val);
    if (v === null || !Number.isInteger(v) || v < 1) return { error: 'Masukkan bilangan bulat positif.' };
    let np: number;
    if (mode === 'prefix') np = v;
    else if (mode === 'count') np = p + Math.ceil(Math.log2(v));
    else np = 32 - Math.ceil(Math.log2(v + 2));
    if (np < p) return { error: `Hasilnya /${np}, lebih besar dari jaringan induk /${p}. Kecilkan angkanya.` };
    if (np > 30) return { error: `Hasilnya /${np}. Subnet terkecil yang didukung adalah /30.` };
    const base = ipv4Info(ip, p);
    const split = splitIPv4(ip, p, np, 256);
    return { base, np, split };
  }, [net, mode, val]);

  return (
    <Card>
      <TextField label="Jaringan induk" value={net} onChange={setNet} placeholder="192.168.10.0/24" mono />
      <Segmented
        label="Bagi berdasarkan"
        value={mode}
        onChange={(v) => {
          setMode(v);
          setVal(v === 'prefix' ? '26' : v === 'count' ? '4' : '50');
        }}
        options={[
          { value: 'count', label: 'Jumlah subnet' },
          { value: 'hosts', label: 'Host per subnet' },
          { value: 'prefix', label: 'Prefix baru' },
        ]}
      />
      <NumField
        label={mode === 'count' ? 'Jumlah subnet yang dibutuhkan' : mode === 'hosts' ? 'Jumlah host per subnet' : 'Prefix baru (mis. 26)'}
        value={val}
        onChange={setVal}
      />
      {'error' in res ? <Notice kind="error">{res.error}</Notice> : null}
      {'split' in res ? (
        <>
          <StatGrid cols={3}>
            <Stat label="Prefix baru" value={`/${(res.np ?? 0)}`} accent />
            <Stat label="Jumlah subnet" value={(res.split ?? { total: 0, rows: [] }).total.toLocaleString('id-ID')} />
            <Stat label="Host per subnet" value={(2 ** (32 - (res.np ?? 0)) - 2).toLocaleString('id-ID')} />
          </StatGrid>
          <p className="text-xs text-zinc-500">Netmask baru: {ipv4Info(parseIPv4((res.base ?? { network: "0.0.0.0" }).network)!, (res.np ?? 0)).mask}</p>
          <div className="inset max-h-96 overflow-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left font-mono text-xs">
              <thead className="sticky top-0 bg-[#0e1115] text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Jaringan</th>
                  <th className="px-3 py-2">Host pertama</th>
                  <th className="px-3 py-2">Host terakhir</th>
                  <th className="px-3 py-2">Broadcast</th>
                </tr>
              </thead>
              <tbody>
                {(res.split ?? { total: 0, rows: [] }).rows.map((r) => (
                  <tr key={r.index} className="border-t border-white/[0.05] text-zinc-200">
                    <td className="px-3 py-1.5 text-zinc-500">{r.index}</td>
                    <td className="px-3 py-1.5">{r.network}/{(res.np ?? 0)}</td>
                    <td className="px-3 py-1.5">{r.firstHost}</td>
                    <td className="px-3 py-1.5">{r.lastHost}</td>
                    <td className="px-3 py-1.5">{r.broadcast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(res.split ?? { total: 0, rows: [] }).total > (res.split ?? { total: 0, rows: [] }).rows.length ? (
            <Notice kind="info">Menampilkan {(res.split ?? { total: 0, rows: [] }).rows.length} dari {(res.split ?? { total: 0, rows: [] }).total.toLocaleString('id-ID')} subnet.</Notice>
          ) : null}
          <CopyButton
            label="Salin daftar jaringan"
            text={(res.split ?? { total: 0, rows: [] }).rows.map((r) => `${r.network}/${(res.np ?? 0)}`).join('\n')}
          />
        </>
      ) : null}
    </Card>
  );
}

// ───────────────────────────── IPv6

function Ipv6Calculator() {
  const [addr, setAddr] = useState('2001:db8:abcd:12::5');
  const [prefix, setPrefix] = useState('64');
  const res = useMemo(() => {
    const a = parseIPv6(addr);
    if (a === null) return { error: addr.trim() ? 'Alamat IPv6 tidak valid (contoh: 2001:db8::1).' : '' };
    const p = parseNum(prefix.replace('/', ''));
    if (p === null || !Number.isInteger(p) || p < 0 || p > 128) return { error: 'Prefix harus bilangan bulat 0–128.' };
    return { info: ipv6Info(a, p) };
  }, [addr, prefix]);
  return (
    <Card>
      <Row>
        <TextField label="Alamat IPv6" value={addr} onChange={setAddr} placeholder="2001:db8::1" mono />
        <TextField label="Prefix (0–128)" value={prefix} onChange={setPrefix} inputMode="numeric" placeholder="64" mono />
      </Row>
      {res.error ? <Notice kind="error">{res.error}</Notice> : null}
      {res.info ? (
        <KeyValue
          rows={[
            ['Ringkas', res.info.compressed],
            ['Lengkap', res.info.full],
            ['Jenis', res.info.kind],
            ['Jaringan', res.info.network],
            ['Alamat pertama', res.info.firstAddress],
            ['Alamat terakhir', res.info.lastAddress],
            ['Total alamat', BigInt(res.info.totalAddresses).toLocaleString('id-ID')],
          ]}
        />
      ) : null}
    </Card>
  );
}

// ───────────────────────────── DNS Lookup

interface DnsResp {
  name: string;
  records: Record<string, { value: string; extra?: string }[]>;
  errors: Record<string, string>;
  queried: string[];
}

function DnsLookup() {
  const api = useApi<DnsResp>();
  const [name, setName] = useState('');
  const [type, setType] = useState('ALL');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) void api.run(`/api/network/dns?name=${encodeURIComponent(name.trim())}&type=${type}`);
  };
  const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA'];
  const d = api.data;
  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <Row>
          <TextField label="Domain" value={name} onChange={setName} placeholder="example.com" mono />
          <SelectField label="Tipe record" value={type} onChange={setType} options={[{ value: 'ALL', label: 'Semua' }, ...types.map((t) => ({ value: t, label: t }))]} />
        </Row>
        <button type="submit" className="btn btn-primary" disabled={api.loading || !name.trim()}>
          <Search size={16} aria-hidden /> Cari
        </button>
      </form>
      {api.loading ? <Busy label="Menanyakan server DNS…" /> : null}
      {api.error ? <Notice kind="error">{api.error}</Notice> : null}
      {d ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">Hasil untuk <span className="font-mono text-zinc-50">{d.name}</span></p>
          {Object.keys(d.records).length === 0 ? <Notice kind="info">Tidak ada record untuk tipe yang diminta.</Notice> : null}
          {Object.entries(d.records).map(([t, list]) => (
            <div key={t} className="inset overflow-hidden">
              <p className="border-b border-white/[0.06] px-3 py-1.5 text-xs font-bold tracking-wider text-accent">{t}</p>
              <ul className="divide-y divide-white/[0.05]">
                {list.map((r, i) => (
                  <li key={i} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <span className="min-w-0 break-all font-mono text-[13px] text-zinc-100">{r.value}</span>
                    {r.extra ? <span className="flex-none text-xs text-zinc-500">{r.extra}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {Object.keys(d.errors).length ? (
            <Notice kind="warn">Sebagian query gagal: {Object.entries(d.errors).map(([t, e]) => `${t} (${e})`).join(', ')}.</Notice>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

// ───────────────────────────── HTTP Status Checker

const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 206: 'Partial Content',
  301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 408: 'Request Timeout',
  410: 'Gone', 418: "I'm a teapot", 429: 'Too Many Requests',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};

function statusTone(s: number): string {
  if (s >= 200 && s < 300) return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
  if (s >= 300 && s < 400) return 'border-sky-400/40 bg-sky-400/10 text-sky-300';
  if (s >= 400 && s < 500) return 'border-amber-400/40 bg-amber-400/10 text-amber-300';
  return 'border-red-400/40 bg-red-400/10 text-red-300';
}

function statusMeaning(s: number): string {
  if (s >= 200 && s < 300) return 'Berhasil';
  if (s >= 300 && s < 400) return 'Pengalihan (redirect)';
  if (s >= 400 && s < 500) return 'Kesalahan di sisi klien / permintaan';
  if (s >= 500) return 'Kesalahan di sisi server';
  return 'Informasi';
}

interface HttpResp {
  ok: boolean;
  method: string;
  hops: { url: string; status: number; location: string | null; ms: number; headers: Record<string, string> }[];
  finalUrl: string;
  tooManyRedirects: boolean;
  totalMs: number;
}

function HttpStatusChecker() {
  const api = useApi<HttpResp>();
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'HEAD'>('GET');
  const d = api.data;
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (url.trim()) void api.run(`/api/network/http?url=${encodeURIComponent(url.trim())}&method=${method}`);
        }}
      >
        <TextField label="URL" value={url} onChange={setUrl} type="text" inputMode="url" placeholder="https://example.com" mono />
        <Segmented label="Metode" value={method} onChange={setMethod} options={[{ value: 'GET', label: 'GET' }, { value: 'HEAD', label: 'HEAD (lebih ringan)' }]} />
        <button type="submit" className="btn btn-primary" disabled={api.loading || !url.trim()}>
          <Search size={16} aria-hidden /> Periksa
        </button>
      </form>
      {api.loading ? <Busy label="Menghubungi server tujuan…" /> : null}
      {api.error ? <Notice kind="error">{api.error}</Notice> : null}
      {d ? (
        <div className="space-y-3">
          <StatGrid cols={3}>
            <Stat label="Status akhir" value={d.hops[d.hops.length - 1]?.status ?? '—'} accent />
            <Stat label="Jumlah redirect" value={Math.max(d.hops.length - 1, 0)} />
            <Stat label="Waktu total" value={`${d.totalMs} ms`} />
          </StatGrid>
          {d.tooManyRedirects ? <Notice kind="warn">Terlalu banyak redirect — pelacakan dihentikan setelah {d.hops.length} langkah.</Notice> : null}
          <ol className="space-y-2.5">
            {d.hops.map((h, i) => (
              <li key={i} className="inset px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className={cn('flex-none rounded-lg border px-2 py-0.5 font-mono text-sm font-bold', statusTone(h.status))}>{h.status}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-[13px] text-zinc-100">{h.url}</p>
                    <p className="text-xs text-zinc-500">
                      {STATUS_TEXT[h.status] ?? statusMeaning(h.status)} · {statusMeaning(h.status)} · {h.ms} ms
                    </p>
                    {h.location ? <p className="mt-1 break-all text-xs text-sky-300">→ {h.location}</p> : null}
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-200">Header respons ({Object.keys(h.headers).length})</summary>
                  <dl className="mt-2 space-y-1 font-mono text-xs">
                    {Object.entries(h.headers).map(([k, v]) => (
                      <div key={k} className="break-all"><dt className="inline text-zinc-500">{k}: </dt><dd className="inline text-zinc-200">{v}</dd></div>
                    ))}
                  </dl>
                </details>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <p className="text-xs text-zinc-500">
        Pengecekan dilakukan dari server ToolsPhone. Alamat privat/internal dan port non-web diblokir demi keamanan.
      </p>
    </Card>
  );
}

// ───────────────────────────── URL Parser

function UrlParser() {
  const [raw, setRaw] = useState('');
  const res = useMemo(() => {
    const t = raw.trim();
    if (!t) return null;
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t);
    try {
      const u = new URL(hasScheme ? t : `https://${t}`);
      return { u, assumed: !hasScheme };
    } catch {
      return { error: 'URL tidak valid. Contoh: https://example.com/path?x=1#bagian' };
    }
  }, [raw]);

  const params = useMemo(() => (res && 'u' in res ? Array.from(res.u?.searchParams.entries() ?? []) : []), [res]);
  const safeDecode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  return (
    <Card>
      <TextField label="URL" value={raw} onChange={setRaw} placeholder="https://user:pass@example.com:8080/a/b?x=1&y=2#top" mono />
      {res && 'error' in res ? <Notice kind="error">{res.error}</Notice> : null}
      {res && 'u' in res ? (
        <>
          {res.assumed ? <Notice kind="info">Tidak ada skema (http/https) — dianggap <strong>https://</strong>.</Notice> : null}
          <KeyValue
            rows={[
              ['Skema', res.u!.protocol.replace(':', '')],
              ['Origin', res.u!.origin === 'null' ? '—' : res.u!.origin],
              ['Username', res.u!.username ? safeDecode(res.u!.username) : '—'],
              ['Password', res.u!.password ? '••••••' : '—'],
              ['Host', res.u!.host || '—'],
              ['Hostname', res.u!.hostname || '—'],
              ['Port', res.u!.port || '(default)'],
              ['Path', res.u!.pathname],
              ['Query string', res.u!.search || '—'],
              ['Fragment', res.u!.hash || '—'],
            ]}
          />
          {res.u!.pathname.split('/').filter(Boolean).length ? (
            <div>
              <p className="label">Segmen path</p>
              <ol className="flex flex-wrap gap-1.5">
                {res.u!.pathname.split('/').filter(Boolean).map((s, i) => (
                  <li key={i} className="badge badge-muted !normal-case !tracking-normal font-mono">{safeDecode(s)}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {params.length ? (
            <div>
              <p className="label">Parameter query ({params.length})</p>
              <div className="inset overflow-x-auto">
                <table className="w-full min-w-[20rem] text-left font-mono text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
                    <tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Nilai</th></tr>
                  </thead>
                  <tbody>
                    {params.map(([k, v], i) => (
                      <tr key={i} className="border-t border-white/[0.05]">
                        <td className="px-3 py-1.5 text-accent">{k}</td>
                        <td className="break-all px-3 py-1.5 text-zinc-200">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

// ───────────────────────────── User-Agent Parser

function UserAgentParser() {
  const [ua, setUa] = useState('');
  useEffect(() => setUa(navigator.userAgent), []);
  const info = useMemo(() => (ua.trim() ? parseUserAgent(ua) : null), [ua]);
  const v = (x: { name: string; version: string } | null) => (x ? `${x.name}${x.version ? ' ' + x.version : ''}` : 'Tidak terdeteksi');
  const deviceType = { desktop: 'Desktop / laptop', mobile: 'Ponsel', tablet: 'Tablet', bot: 'Bot / crawler', unknown: 'Tidak diketahui' };
  return (
    <Card>
      <div className="space-y-2">
        <label htmlFor="ua-input" className="label">User-Agent</label>
        <textarea id="ua-input" className="input font-mono text-[13px]" rows={4} value={ua} onChange={(e) => setUa(e.target.value)} placeholder="Mozilla/5.0 (…)" spellCheck={false} />
        <Actions>
          <button type="button" className="btn btn-sm" onClick={() => setUa(navigator.userAgent)}>Pakai UA perangkat ini</button>
        </Actions>
      </div>
      {info ? (
        <>
          <KeyValue
            rows={[
              ['Browser', v(info.browser)],
              ['Engine', v(info.engine)],
              ['Sistem operasi', v(info.os)],
              ['Jenis perangkat', deviceType[info.device.type]],
              ['Merek', info.device.vendor ?? 'Tidak terdeteksi'],
              ['Model', info.device.model ?? 'Tidak terdeteksi'],
            ]}
          />
          <p className="text-xs text-zinc-500">
            User-Agent bisa dipalsukan dan browser modern makin menyederhanakannya (mis. macOS selalu tertulis 10.15.7), jadi hasil ini hanya perkiraan.
          </p>
        </>
      ) : null}
    </Card>
  );
}

// ───────────────────────────── Domain Information

interface DomainResp {
  name: string;
  dns: { a: string[]; aaaa: string[]; ns: string[]; mx: { exchange: string; priority: number }[] };
  rdap: null | {
    registrar: string | null; created: string | null; expires: string | null; updated: string | null;
    status: string[]; nameservers: string[]; dnssec: boolean | null;
  };
  rdapNote: string | null;
  source: string | null;
}

function DomainInformation() {
  const api = useApi<DomainResp>();
  const [name, setName] = useState('');
  const d = api.data;
  const days = d?.rdap?.expires ? Math.ceil((new Date(d.rdap.expires).getTime() - Date.now()) / 86_400_000) : null;
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (name.trim()) void api.run(`/api/network/domain?name=${encodeURIComponent(name.trim())}`);
        }}
      >
        <TextField label="Domain" value={name} onChange={setName} placeholder="example.com" mono />
        <button type="submit" className="btn btn-primary" disabled={api.loading || !name.trim()}>
          <Search size={16} aria-hidden /> Cari info domain
        </button>
      </form>
      {api.loading ? <Busy label="Mengambil data domain…" /> : null}
      {api.error ? <Notice kind="error">{api.error}</Notice> : null}
      {d ? (
        <div className="space-y-4">
          {d.rdap ? (
            <div>
              <p className="label">Registrasi (RDAP)</p>
              <KeyValue
                rows={[
                  ['Registrar', d.rdap.registrar ?? '—'],
                  ['Terdaftar', d.rdap.created ? formatDateTime(d.rdap.created) : '—'],
                  ['Kedaluwarsa', d.rdap.expires ? `${formatDateTime(d.rdap.expires)}${days !== null ? (days >= 0 ? ` (${days} hari lagi)` : ' (sudah lewat)') : ''}` : '—'],
                  ['Terakhir diubah', d.rdap.updated ? formatDateTime(d.rdap.updated) : '—'],
                  ['Status', d.rdap.status.length ? d.rdap.status.join(', ') : '—'],
                  ['DNSSEC', d.rdap.dnssec === null ? '—' : d.rdap.dnssec ? 'Aktif' : 'Tidak aktif'],
                  ['Nameserver (registri)', d.rdap.nameservers.length ? d.rdap.nameservers.join(', ') : '—'],
                ]}
              />
              <p className="mt-1 text-xs text-zinc-500">Sumber: {d.source}</p>
            </div>
          ) : d.rdapNote ? (
            <Notice kind="info">{d.rdapNote}</Notice>
          ) : null}
          <div>
            <p className="label">DNS</p>
            <KeyValue
              rows={[
                ['A (IPv4)', d.dns.a.length ? d.dns.a.join(', ') : '—'],
                ['AAAA (IPv6)', d.dns.aaaa.length ? d.dns.aaaa.join(', ') : '—'],
                ['NS', d.dns.ns.length ? d.dns.ns.join(', ') : '—'],
                ['MX', d.dns.mx.length ? d.dns.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ') : '—'],
              ]}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

const tools: Record<string, ComponentType> = {
  'ip-checker': IpChecker,
  'ipv4-calculator': Ipv4Calculator,
  'ipv6-calculator': Ipv6Calculator,
  'cidr-calculator': CidrCalculator,
  'subnet-calculator': SubnetCalculator,
  'dns-lookup': DnsLookup,
  'http-status-checker': HttpStatusChecker,
  'url-parser': UrlParser,
  'user-agent-parser': UserAgentParser,
  'domain-information': DomainInformation,
};

export default tools;
