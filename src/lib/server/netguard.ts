// Util keamanan jaringan SISI SERVER. Jangan di-import dari komponen client.
//
// Perlindungan SSRF berlapis untuk tool yang melakukan request keluar (HTTP Status Checker, Domain Info):
//  1. Hanya http/https, port 80/443/8080/8443, tanpa kredensial di URL.
//  2. IP literal dicek langsung terhadap daftar blokir (privat, loopback, link-local, metadata cloud, dll).
//  3. Nama host di-resolve lewat `lookup` kustom yang MEMVALIDASI alamat pada saat koneksi dibuat
//     (bukan sebelumnya) → kebal terhadap DNS rebinding.
//  4. Redirect diikuti manual (maks 5 hop) dan setiap hop divalidasi ulang.
//  5. Timeout total, body tidak pernah dibaca.

import dns from 'node:dns';
import type net from 'node:net';
import { Agent, request } from 'undici';
import { isBlockedAddress } from '../ip';
import { GuardError, validateTargetUrl } from './guard';

export { GuardError, getClientIp, normalizeDomain, rateLimit, validateTargetUrl } from './guard';

// ───────────────────────────── guarded HTTP

const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as (e: NodeJS.ErrnoException) => void)(err);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isBlockedAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error('Alamat tujuan diblokir');
      e.code = 'EBLOCKED';
      return (callback as (e: NodeJS.ErrnoException) => void)(e);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

let agent: Agent | null = null;
function getAgent(): Agent {
  if (!agent) {
    agent = new Agent({
      connect: { lookup: guardedLookup, timeout: 5000 },
      headersTimeout: 8000,
      bodyTimeout: 5000,
      connections: 8,
    });
  }
  return agent;
}

export interface Hop {
  url: string;
  status: number;
  location: string | null;
  ms: number;
  ip?: string;
  headers: Record<string, string>;
}

export interface ChainResult {
  hops: Hop[];
  finalUrl: string;
  tooManyRedirects: boolean;
  totalMs: number;
}

function flattenHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
}

export async function fetchChain(raw: string, opts: { method?: 'GET' | 'HEAD'; maxHops?: number } = {}): Promise<ChainResult> {
  const method = opts.method ?? 'GET';
  const maxHops = opts.maxHops ?? 5;
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  const hops: Hop[] = [];
  let current = validateTargetUrl(raw);
  let tooMany = false;
  try {
    for (let i = 0; i <= maxHops; i++) {
      const t0 = Date.now();
      const res = await request(current, {
        method,
        dispatcher: getAgent(),
        signal: ctrl.signal,
        headers: { 'user-agent': 'ToolsPhone-StatusChecker/1.0 (+https://toolsphone.auctionnuvexastore.biz.id)', accept: '*/*' },
        maxRedirections: 0,
      });
      // Body tidak dibutuhkan — hentikan agar tidak mengunduh.
      res.body.destroy();
      const headers = flattenHeaders(res.headers);
      const location = headers.location ?? null;
      hops.push({ url: current.toString(), status: res.statusCode, location, ms: Date.now() - t0, headers });
      const isRedirect = res.statusCode >= 300 && res.statusCode < 400 && location;
      if (!isRedirect) break;
      if (i === maxHops) {
        tooMany = true;
        break;
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        break;
      }
      current = validateTargetUrl(next.toString()); // validasi ulang tiap hop
    }
  } finally {
    clearTimeout(timer);
  }
  return { hops, finalUrl: hops[hops.length - 1]?.url ?? current.toString(), tooManyRedirects: tooMany, totalMs: Date.now() - started };
}

/** GET JSON dengan perlindungan SSRF yang sama (dipakai untuk RDAP). Batas ukuran body 1 MB. */
export async function fetchJsonGuarded<T>(raw: string, maxHops = 5): Promise<{ status: number; body: T | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    let current = validateTargetUrl(raw);
    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await request(current, {
        method: 'GET',
        dispatcher: getAgent(),
        signal: ctrl.signal,
        headers: {
          'user-agent': 'ToolsPhone-DomainInfo/1.0 (+https://toolsphone.auctionnuvexastore.biz.id)',
          accept: 'application/rdap+json, application/json',
        },
        maxRedirections: 0,
      });
      const location = flattenHeaders(res.headers).location;
      if (res.statusCode >= 300 && res.statusCode < 400 && location) {
        res.body.destroy();
        current = validateTargetUrl(new URL(location, current).toString());
        continue;
      }
      if (res.statusCode !== 200) {
        res.body.destroy();
        return { status: res.statusCode, body: null };
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of res.body) {
        const buf = chunk as Buffer;
        size += buf.length;
        if (size > 1_000_000) {
          res.body.destroy();
          throw new GuardError('TOO_BIG', 'Respons terlalu besar.');
        }
        chunks.push(buf);
      }
      try {
        return { status: 200, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as T };
      } catch {
        return { status: 200, body: null };
      }
    }
    throw new GuardError('TOO_MANY_REDIRECTS', 'Terlalu banyak pengalihan (redirect).');
  } finally {
    clearTimeout(timer);
  }
}

/** Terjemahkan error jaringan ke pesan Indonesia yang ramah. */
export function describeNetError(e: unknown): { message: string; code: string } {
  if (e instanceof GuardError) return { message: e.message, code: e.code };
  const err = e as { code?: string; name?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err.cause?.code ?? err.code ?? err.name ?? 'ERROR';
  switch (code) {
    case 'EBLOCKED':
      return { message: 'Alamat tujuan diblokir (jaringan privat / internal tidak diizinkan).', code };
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return { message: 'Domain tidak ditemukan (resolusi DNS gagal).', code };
    case 'ECONNREFUSED':
      return { message: 'Koneksi ditolak oleh server tujuan.', code };
    case 'ECONNRESET':
    case 'UND_ERR_SOCKET':
      return { message: 'Koneksi diputus oleh server tujuan.', code };
    case 'UND_ERR_CONNECT_TIMEOUT':
    case 'UND_ERR_HEADERS_TIMEOUT':
    case 'ETIMEDOUT':
    case 'AbortError':
      return { message: 'Server tujuan tidak merespons tepat waktu.', code };
    case 'CERT_HAS_EXPIRED':
      return { message: 'Sertifikat SSL sudah kedaluwarsa.', code };
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
      return { message: 'Sertifikat SSL self-signed (tidak dipercaya).', code };
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
      return { message: 'Rantai sertifikat SSL tidak lengkap / tidak dipercaya.', code };
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return { message: 'Sertifikat SSL tidak cocok dengan nama domain.', code };
    default:
      return { message: 'Gagal menghubungi server tujuan.', code };
  }
}
