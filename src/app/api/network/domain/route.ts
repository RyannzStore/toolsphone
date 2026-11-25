import dns from 'node:dns';
import { describeNetError, fetchJsonGuarded, normalizeDomain } from '@/lib/server/netguard';
import { json, limited } from '@/lib/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}
interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, [string, unknown, string, unknown][]];
  publicIds?: { type?: string; identifier?: string }[];
}
interface Rdap {
  ldhName?: string;
  status?: string[];
  events?: RdapEvent[];
  nameservers?: { ldhName?: string }[];
  entities?: RdapEntity[];
  secureDNS?: { delegationSigned?: boolean };
}

function vcardName(e: RdapEntity): string | null {
  const fn = e.vcardArray?.[1]?.find((p) => p[0] === 'fn');
  return fn && typeof fn[3] === 'string' ? fn[3] : null;
}

export async function GET(req: Request) {
  const rl = limited(req, 'domain', 15);
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const name = normalizeDomain(searchParams.get('name') ?? '');
  if (!name) return json({ error: 'Nama domain tidak valid (contoh: example.com).', code: 'BAD_DOMAIN' }, 400);

  const resolver = new dns.promises.Resolver({ timeout: 3500, tries: 2 });
  const [a, aaaa, ns, mx] = await Promise.allSettled([
    resolver.resolve4(name),
    resolver.resolve6(name),
    resolver.resolveNs(name),
    resolver.resolveMx(name),
  ]);
  const val = <T,>(r: PromiseSettledResult<T>): T | [] => (r.status === 'fulfilled' ? r.value : []);
  const dnsInfo = {
    a: val(a) as string[],
    aaaa: val(aaaa) as string[],
    ns: val(ns) as string[],
    mx: (val(mx) as { exchange: string; priority: number }[]).sort((x, y) => x.priority - y.priority),
  };
  const hasDns = dnsInfo.a.length + dnsInfo.aaaa.length + dnsInfo.ns.length + dnsInfo.mx.length > 0;

  // RDAP lewat rdap.org (bootstrap redirector). Tidak semua TLD punya RDAP publik.
  let rdap: null | {
    registrar: string | null;
    created: string | null;
    expires: string | null;
    updated: string | null;
    status: string[];
    nameservers: string[];
    dnssec: boolean | null;
  } = null;
  let rdapNote: string | null = null;
  try {
    const { status, body } = await fetchJsonGuarded<Rdap>(`https://rdap.org/domain/${encodeURIComponent(name)}`);
    if (status === 200 && body) {
      const ev = (action: string) => body.events?.find((e) => e.eventAction === action)?.eventDate ?? null;
      const registrar = body.entities?.find((e) => e.roles?.includes('registrar'));
      rdap = {
        registrar: registrar ? vcardName(registrar) : null,
        created: ev('registration'),
        expires: ev('expiration'),
        updated: ev('last changed'),
        status: body.status ?? [],
        nameservers: (body.nameservers ?? []).map((n) => n.ldhName ?? '').filter(Boolean),
        dnssec: typeof body.secureDNS?.delegationSigned === 'boolean' ? body.secureDNS.delegationSigned : null,
      };
    } else if (status === 404) {
      rdapNote = 'Data registrasi (RDAP) tidak tersedia untuk domain ini. Beberapa TLD (termasuk banyak ccTLD) belum menyediakan RDAP publik.';
    } else {
      rdapNote = 'Layanan RDAP sedang tidak dapat dihubungi.';
    }
  } catch (e) {
    rdapNote = `Data registrasi (RDAP) tidak dapat diambil: ${describeNetError(e).message}`;
  }

  if (!hasDns && !rdap) {
    return json({ error: 'Tidak ada data DNS maupun registrasi untuk domain ini. Mungkin belum terdaftar.', code: 'NOT_FOUND', name, rdapNote }, 404);
  }
  return json({ name, dns: dnsInfo, rdap, rdapNote, source: rdap ? 'rdap.org' : null });
}
