import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from './netguard';

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

/** Cek rate limit per IP untuk satu endpoint. Mengembalikan response 429 bila terlampaui. */
export function limited(req: Request, bucket: string, limit: number, windowMs = 60_000): NextResponse | null {
  const ip = getClientIp(req) ?? 'unknown';
  const r = rateLimit(`${bucket}:${ip}`, limit, windowMs);
  if (r.ok) return null;
  return json(
    { error: `Terlalu banyak permintaan. Coba lagi dalam ${r.retryAfter} detik.`, code: 'RATE_LIMITED' },
    429,
    { 'Retry-After': String(r.retryAfter) },
  );
}
