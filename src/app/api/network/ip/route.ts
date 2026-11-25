import net from 'node:net';
import { getClientIp } from '@/lib/server/netguard';
import { json, limited } from '@/lib/server/api';
import { isBlockedAddress } from '@/lib/ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Geo {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: number | null;
}

const cache = new Map<string, { at: number; geo: Geo | null }>();
const TTL = 10 * 60_000;

async function lookupGeo(ip: string): Promise<Geo | null> {
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL) return hit.geo;
  let geo: Geo | null = null;
  try {
    // Layanan pihak ketiga gratis; perkiraan lokasi dari IP, bukan lokasi pasti.
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(4500), cache: 'no-store' });
    if (res.ok) {
      const d = (await res.json()) as Record<string, unknown> & {
        timezone?: { id?: string };
        connection?: { isp?: string; org?: string; asn?: number };
      };
      if (d.success !== false) {
        geo = {
          country: (d.country as string) ?? null,
          countryCode: (d.country_code as string) ?? null,
          region: (d.region as string) ?? null,
          city: (d.city as string) ?? null,
          latitude: typeof d.latitude === 'number' ? d.latitude : null,
          longitude: typeof d.longitude === 'number' ? d.longitude : null,
          timezone: d.timezone?.id ?? null,
          isp: d.connection?.isp ?? null,
          org: d.connection?.org ?? null,
          asn: d.connection?.asn ?? null,
        };
      }
    }
  } catch {
    geo = null;
  }
  if (cache.size > 500) cache.clear();
  cache.set(ip, { at: Date.now(), geo });
  return geo;
}

export async function GET(req: Request) {
  const rl = limited(req, 'ip', 40);
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const asked = searchParams.get('ip')?.trim();
  const ip = asked || getClientIp(req);
  if (!ip) {
    return json({ error: 'IP klien tidak terdeteksi. Pastikan reverse proxy meneruskan header X-Forwarded-For.', code: 'NO_IP' }, 200);
  }
  const version = net.isIP(ip);
  if (!version) return json({ error: 'Format IP tidak valid.', code: 'BAD_IP' }, 400);

  if (isBlockedAddress(ip)) {
    return json({
      ip,
      version,
      self: !asked,
      scope: 'non-public',
      note: 'Ini alamat privat / lokal / khusus, jadi tidak punya data lokasi atau ISP publik.',
      geo: null,
    });
  }
  const geo = await lookupGeo(ip);
  return json({ ip, version, self: !asked, scope: 'public', geo, source: geo ? 'ipwho.is' : null });
}
