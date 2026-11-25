// Validasi & util murni untuk perlindungan SSRF (tanpa dependensi jaringan → bisa dites langsung).
// Jangan di-import dari komponen client.

import net from 'node:net';
import { domainToASCII } from 'node:url';
import { isBlockedAddress } from '../ip';

export class GuardError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const BLOCKED_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet', '.private', '.invalid', '.test', '.example', '.onion'];
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

/** Normalisasi & validasi nama domain publik. Mengembalikan null bila tidak valid. */
export function normalizeDomain(input: string): string | null {
  let h = input.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return null;
  h = domainToASCII(h);
  if (!h || h.length > 253) return null;
  if (net.isIP(h)) return null;
  const labels = h.split('.');
  if (labels.length < 2) return null;
  for (const l of labels) {
    if (!/^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(l)) return null;
  }
  const tld = labels[labels.length - 1];
  if (!/^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(tld)) return null;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return null;
  return h;
}

export function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return stripV4Mapped(first);
  }
  const real = req.headers.get('x-real-ip');
  if (real) return stripV4Mapped(real.trim());
  return null;
}

function stripV4Mapped(ip: string): string {
  return ip.startsWith('::ffff:') && net.isIPv4(ip.slice(7)) ? ip.slice(7) : ip;
}

// ───────────────────────────── rate limit (in-memory, per instance)

const buckets = new Map<string, { count: number; reset: number }>();

/** Rate limit sederhana. Cukup untuk 1 proses (PM2 fork); gunakan Redis bila berjalan multi-instance. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
}


export function validateTargetUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim().includes('://') ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new GuardError('BAD_URL', 'URL tidak valid.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new GuardError('BAD_PROTOCOL', 'Hanya URL http:// atau https:// yang didukung.');
  if (u.username || u.password) throw new GuardError('BAD_URL', 'URL dengan username/password tidak didukung.');
  if (!ALLOWED_PORTS.has(u.port)) throw new GuardError('BAD_PORT', 'Port tidak diizinkan (hanya 80, 443, 8080, 8443).');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new GuardError('BLOCKED', 'Alamat tujuan diblokir (jaringan privat / internal tidak diizinkan).');
  } else if (!normalizeDomain(host)) {
    throw new GuardError('BAD_HOST', 'Nama domain tidak valid atau tidak diizinkan.');
  }
  return u;
}

