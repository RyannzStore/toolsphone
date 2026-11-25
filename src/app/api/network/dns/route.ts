import dns from 'node:dns';
import { normalizeDomain } from '@/lib/server/netguard';
import { json, limited } from '@/lib/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA'] as const;
type RType = (typeof TYPES)[number];

export interface DnsRecord {
  value: string;
  extra?: string;
}

async function query(resolver: dns.promises.Resolver, name: string, type: RType): Promise<DnsRecord[]> {
  switch (type) {
    case 'A':
      return (await resolver.resolve4(name, { ttl: true })).map((r) => ({ value: r.address, extra: `TTL ${r.ttl}s` }));
    case 'AAAA':
      return (await resolver.resolve6(name, { ttl: true })).map((r) => ({ value: r.address, extra: `TTL ${r.ttl}s` }));
    case 'MX':
      return (await resolver.resolveMx(name)).sort((a, b) => a.priority - b.priority).map((r) => ({ value: r.exchange, extra: `prioritas ${r.priority}` }));
    case 'TXT':
      return (await resolver.resolveTxt(name)).map((r) => ({ value: r.join('') }));
    case 'NS':
      return (await resolver.resolveNs(name)).map((v) => ({ value: v }));
    case 'CNAME':
      return (await resolver.resolveCname(name)).map((v) => ({ value: v }));
    case 'SOA': {
      const s = await resolver.resolveSoa(name);
      return [{ value: s.nsname, extra: `admin ${s.hostmaster} · serial ${s.serial} · refresh ${s.refresh}s · retry ${s.retry}s · expire ${s.expire}s · minTTL ${s.minttl}s` }];
    }
    case 'CAA':
      return (await resolver.resolveCaa(name)).map((r) => {
        const tag = (['issue', 'issuewild', 'iodef', 'contactemail', 'contactphone'] as const).find((k) => k in r);
        return { value: tag ? String((r as unknown as Record<string, unknown>)[tag]) : '', extra: tag ?? `flag ${r.critical}` };
      });
  }
}

const EMPTY_CODES = new Set(['ENODATA', 'ENOTFOUND', 'NODATA', 'NOTFOUND']);

export async function GET(req: Request) {
  const rl = limited(req, 'dns', 30);
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const name = normalizeDomain(searchParams.get('name') ?? '');
  if (!name) return json({ error: 'Nama domain tidak valid (contoh: example.com).', code: 'BAD_DOMAIN' }, 400);
  const typeParam = (searchParams.get('type') ?? 'ALL').toUpperCase();
  const types: RType[] = typeParam === 'ALL' ? [...TYPES] : (TYPES as readonly string[]).includes(typeParam) ? [typeParam as RType] : [];
  if (!types.length) return json({ error: 'Tipe record tidak didukung.', code: 'BAD_TYPE' }, 400);

  const resolver = new dns.promises.Resolver({ timeout: 3500, tries: 2 });
  const settled = await Promise.allSettled(types.map((t) => query(resolver, name, t)));

  const records: Partial<Record<RType, DnsRecord[]>> = {};
  const errors: Partial<Record<RType, string>> = {};
  let notFound = 0;
  let failed = 0;
  settled.forEach((r, i) => {
    const t = types[i];
    if (r.status === 'fulfilled') {
      if (r.value.length) records[t] = r.value;
    } else {
      const code = (r.reason as { code?: string })?.code ?? '';
      if (code === 'ENOTFOUND' || code === 'NOTFOUND') notFound++;
      if (!EMPTY_CODES.has(code)) {
        failed++;
        errors[t] = code === 'ETIMEOUT' || code === 'ETIMEDOUT' ? 'timeout' : code === 'ESERVFAIL' ? 'SERVFAIL' : code || 'gagal';
      }
    }
  });

  const total = Object.values(records).reduce((n, a) => n + (a?.length ?? 0), 0);
  if (total === 0 && notFound === types.length) {
    return json({ error: 'Domain tidak ditemukan (NXDOMAIN).', code: 'NXDOMAIN', name }, 404);
  }
  if (total === 0 && failed === types.length) {
    return json({ error: 'Server DNS tidak merespons. Coba lagi sebentar.', code: 'DNS_FAIL', name }, 502);
  }
  return json({ name, records, errors, queried: types });
}
