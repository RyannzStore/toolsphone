// Utilitas IP murni (tanpa dependensi) — dipakai kalkulator jaringan & proteksi SSRF.

export function parseIPv4(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s.trim());
  if (!m) return null;
  let n = 0;
  for (let k = 1; k <= 4; k++) {
    const part = m[k];
    const o = Number(part);
    if (o > 255) return null;
    if (part.length > 1 && part[0] === '0') return null; // ambigu (oktal) → tolak
    n = n * 256 + o;
  }
  return n;
}

export function ipv4ToString(n: number): string {
  return [n / 16777216, n / 65536, n / 256, n].map((x) => Math.floor(x) % 256).join('.');
}

export function prefixToMask(p: number): number {
  if (p <= 0) return 0;
  return (0xffffffff << (32 - p)) >>> 0;
}

export function maskToPrefix(mask: number): number | null {
  let p = 0;
  let seenZero = false;
  for (let b = 31; b >= 0; b--) {
    const bit = Math.floor(mask / 2 ** b) % 2;
    if (bit === 1) {
      if (seenZero) return null;
      p++;
    } else {
      seenZero = true;
    }
  }
  return p;
}

/** Terima "24", "/24", atau mask bertitik "255.255.255.0" → prefix. */
export function parsePrefixOrMask(s: string): number | null {
  const t = s.trim().replace(/^\//, '');
  if (/^\d{1,2}$/.test(t)) {
    const p = Number(t);
    return p >= 0 && p <= 32 ? p : null;
  }
  const m = parseIPv4(t);
  if (m === null) return null;
  return maskToPrefix(m);
}

export function toBinary32(n: number): string {
  const bits = n.toString(2).padStart(32, '0');
  return bits.match(/.{8}/g)!.join('.');
}

export function ipv4Kind(n: number): string {
  const o1 = Math.floor(n / 16777216);
  const o2 = Math.floor(n / 65536) % 256;
  if (o1 === 0) return 'Alamat "this network" (0.0.0.0/8)';
  if (o1 === 10) return 'Privat (10.0.0.0/8)';
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return 'CGNAT (100.64.0.0/10)';
  if (o1 === 127) return 'Loopback (127.0.0.0/8)';
  if (o1 === 169 && o2 === 254) return 'Link-local (169.254.0.0/16)';
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return 'Privat (172.16.0.0/12)';
  if (o1 === 192 && o2 === 168) return 'Privat (192.168.0.0/16)';
  if (o1 >= 224 && o1 <= 239) return 'Multicast (224.0.0.0/4)';
  if (o1 >= 240) return 'Dicadangkan (240.0.0.0/4)';
  return 'Publik';
}

export function ipv4Class(n: number): string {
  const o1 = Math.floor(n / 16777216);
  if (o1 < 128) return 'A';
  if (o1 < 192) return 'B';
  if (o1 < 224) return 'C';
  if (o1 < 240) return 'D (multicast)';
  return 'E (dicadangkan)';
}

export interface IPv4Info {
  ip: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: string;
  kind: string;
  binaryIp: string;
  binaryMask: string;
}

export function ipv4Info(ip: number, prefix: number): IPv4Info {
  const mask = prefixToMask(prefix);
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  let first = network + 1;
  let last = broadcast - 1;
  let usable = Math.max(total - 2, 0);
  if (prefix === 31) {
    first = network;
    last = broadcast;
    usable = 2;
  } else if (prefix === 32) {
    first = network;
    last = network;
    usable = 1;
  }
  return {
    ip: ipv4ToString(ip),
    prefix,
    mask: ipv4ToString(mask),
    wildcard: ipv4ToString(wildcard),
    network: ipv4ToString(network),
    broadcast: ipv4ToString(broadcast),
    firstHost: ipv4ToString(first),
    lastHost: ipv4ToString(last),
    totalAddresses: total,
    usableHosts: usable,
    ipClass: ipv4Class(ip),
    kind: ipv4Kind(ip),
    binaryIp: toBinary32(ip),
    binaryMask: toBinary32(mask),
  };
}

export function ipv4InCidr(ip: number, netIp: number, prefix: number): boolean {
  const mask = prefixToMask(prefix);
  return ((ip & mask) >>> 0) === ((netIp & mask) >>> 0);
}

export interface SubnetRow {
  index: number;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  usable: number;
}

export function splitIPv4(ip: number, prefix: number, newPrefix: number, limit = 256): { rows: SubnetRow[]; total: number } {
  const mask = prefixToMask(prefix);
  const base = (ip & mask) >>> 0;
  const count = 2 ** (newPrefix - prefix);
  const size = 2 ** (32 - newPrefix);
  const rows: SubnetRow[] = [];
  for (let i = 0; i < Math.min(count, limit); i++) {
    const net = base + i * size;
    const info = ipv4Info(net, newPrefix);
    rows.push({
      index: i + 1,
      network: info.network,
      firstHost: info.firstHost,
      lastHost: info.lastHost,
      broadcast: info.broadcast,
      usable: info.usableHosts,
    });
  }
  return { rows, total: count };
}

// ---------------------------------------------------------------- IPv6

const FULL128 = (1n << 128n) - 1n;

export function parseIPv6(input: string): bigint | null {
  let str = input.trim().toLowerCase();
  if (str.startsWith('[') && str.endsWith(']')) str = str.slice(1, -1);
  const zone = str.indexOf('%');
  if (zone >= 0) str = str.slice(0, zone);
  if (!str || !/^[0-9a-f:.]+$/.test(str)) return null;
  if (str.includes('.')) {
    const idx = str.lastIndexOf(':');
    const v4 = parseIPv4(str.slice(idx + 1));
    if (idx < 0 || v4 === null) return null;
    str = str.slice(0, idx + 1) + ((v4 >>> 16) & 0xffff).toString(16) + ':' + (v4 & 0xffff).toString(16);
  }
  const dbl = str.split('::');
  if (dbl.length > 2) return null;
  const split = (p: string): string[] => (p === '' ? [] : p.split(':'));
  const head = split(dbl[0]);
  let groups: string[];
  if (dbl.length === 2) {
    const tail = split(dbl[1]);
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array<string>(missing).fill('0'), ...tail];
  } else {
    groups = head;
    if (groups.length !== 8) return null;
  }
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    n = (n << 16n) | BigInt(parseInt(g, 16));
  }
  return n;
}

function groups8(n: bigint): number[] {
  const out: number[] = [];
  for (let i = 7; i >= 0; i--) out.push(Number((n >> BigInt(i * 16)) & 0xffffn));
  return out;
}

export function ipv6Full(n: bigint): string {
  return groups8(n).map((g) => g.toString(16).padStart(4, '0')).join(':');
}

export function ipv6Compressed(n: bigint): string {
  const g = groups8(n);
  let bestStart = -1;
  let bestLen = 0;
  let i = 0;
  while (i < 8) {
    if (g[i] === 0) {
      let j = i;
      while (j < 8 && g[j] === 0) j++;
      if (j - i > bestLen) {
        bestLen = j - i;
        bestStart = i;
      }
      i = j;
    } else {
      i++;
    }
  }
  const hex = g.map((x) => x.toString(16));
  if (bestLen < 2) return hex.join(':');
  const left = hex.slice(0, bestStart).join(':');
  const right = hex.slice(bestStart + bestLen).join(':');
  return left + '::' + right;
}

function inV6(addr: bigint, base: string, prefix: number): boolean {
  const b = parseIPv6(base);
  if (b === null) return false;
  const mask = FULL128 ^ ((1n << BigInt(128 - prefix)) - 1n);
  return (addr & mask) === (b & mask);
}

export function ipv6Kind(n: bigint): string {
  if (n === 0n) return 'Unspecified (::)';
  if (n === 1n) return 'Loopback (::1)';
  if (inV6(n, '::ffff:0:0', 96)) return 'IPv4-mapped (::ffff:0:0/96)';
  if (inV6(n, '64:ff9b::', 96)) return 'NAT64 (64:ff9b::/96)';
  if (inV6(n, 'fe80::', 10)) return 'Link-local (fe80::/10)';
  if (inV6(n, 'fc00::', 7)) return 'Unique local / privat (fc00::/7)';
  if (inV6(n, 'ff00::', 8)) return 'Multicast (ff00::/8)';
  if (inV6(n, '2001:db8::', 32)) return 'Dokumentasi (2001:db8::/32)';
  if (inV6(n, '2000::', 3)) return 'Global unicast (2000::/3)';
  return 'Dicadangkan / lainnya';
}

export interface IPv6Info {
  full: string;
  compressed: string;
  prefix: number;
  network: string;
  firstAddress: string;
  lastAddress: string;
  totalAddresses: string;
  kind: string;
}

export function ipv6Info(addr: bigint, prefix: number): IPv6Info {
  const hostBits = BigInt(128 - prefix);
  const mask = FULL128 ^ ((1n << hostBits) - 1n);
  const network = addr & mask;
  const last = network | (FULL128 ^ mask);
  return {
    full: ipv6Full(addr),
    compressed: ipv6Compressed(addr),
    prefix,
    network: ipv6Compressed(network) + '/' + prefix,
    firstAddress: ipv6Compressed(network),
    lastAddress: ipv6Compressed(last),
    totalAddresses: (1n << hostBits).toString(),
    kind: ipv6Kind(addr),
  };
}

// ---------------------------------------------------------------- SSRF guard

/** True bila alamat tidak boleh diakses oleh fetch server (privat / loopback / dsb). */
export function isBlockedAddress(addr: string): boolean {
  const v4 = parseIPv4(addr);
  if (v4 !== null) return isBlockedV4(v4);
  const v6 = parseIPv6(addr);
  if (v6 === null) return true; // tidak dikenali → blokir
  if (inV6(v6, '::ffff:0:0', 96)) return isBlockedV4(Number(v6 & 0xffffffffn));
  if (inV6(v6, '64:ff9b::', 96)) return isBlockedV4(Number(v6 & 0xffffffffn));
  if (v6 === 0n || v6 === 1n) return true;
  if (inV6(v6, 'fc00::', 7)) return true;
  if (inV6(v6, 'fe80::', 10)) return true;
  if (inV6(v6, 'ff00::', 8)) return true;
  if (inV6(v6, '2001:db8::', 32)) return true;
  if (inV6(v6, '100::', 64)) return true; // discard-only
  if (!inV6(v6, '2000::', 3)) return true; // hanya global unicast yang diizinkan
  return false;
}

function isBlockedV4(n: number): boolean {
  const o1 = Math.floor(n / 16777216);
  const o2 = Math.floor(n / 65536) % 256;
  const o3 = Math.floor(n / 256) % 256;
  if (o1 === 0 || o1 === 10 || o1 === 127) return true;
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
  if (o1 === 169 && o2 === 254) return true;
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
  if (o1 === 192 && o2 === 0 && (o3 === 0 || o3 === 2)) return true;
  if (o1 === 192 && o2 === 168) return true;
  if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;
  if (o1 === 198 && o2 === 51 && o3 === 100) return true;
  if (o1 === 203 && o2 === 0 && o3 === 113) return true;
  if (o1 >= 224) return true;
  return false;
}

// ---------------------------------------------------------------- range → CIDR

/** Himpunan CIDR minimal yang menutup persis rentang [start, end] (inklusif). */
export function rangeToCidrs(start: number, end: number): { cidr: string; network: string; prefix: number; size: number }[] {
  const out: { cidr: string; network: string; prefix: number; size: number }[] = [];
  if (start > end) return out;
  let cur = start;
  while (cur <= end) {
    let size = cur === 0 ? 4294967296 : (cur & -cur) >>> 0; // blok terbesar yang selaras dengan `cur`
    const remaining = end - cur + 1;
    while (size > remaining) size /= 2;
    const prefix = 32 - Math.log2(size);
    out.push({ cidr: `${ipv4ToString(cur)}/${prefix}`, network: ipv4ToString(cur), prefix, size });
    cur += size;
  }
  return out;
}
