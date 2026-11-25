// Tes logika murni (tanpa framework): npm run test:logic
// Berjalan dengan Node >= 22.18 (type stripping bawaan).
import assert from 'node:assert/strict';
import { evaluate, formatResult, MathError } from '../src/lib/math.ts';
import {
  parseIPv4, ipv4Info, parsePrefixOrMask, parseIPv6, ipv6Compressed, ipv6Full, ipv6Info,
  isBlockedAddress, splitIPv4, ipv4InCidr, rangeToCidrs,
} from '../src/lib/ip.ts';
import { md5 } from '../src/lib/md5.ts';
import { diffLines } from '../src/lib/diff.ts';
import { parseUserAgent } from '../src/lib/ua.ts';
import {
  parseFraction, fracOp, fracToMixed, fracToDecimal, fracToString, simplifyRatio, solveProportion, computeStats, parseNumberList, gcd,
} from '../src/lib/calc.ts';
import { AREA_SHAPES, VOLUME_SHAPES, runShape } from '../src/lib/geometry.ts';
import {
  applyDiscount, tieredDiscount, discountPlusTax, profitLoss, sellFromMarkup, sellFromMargin, percentChange,
  installmentAnnuity, installmentFlat, monthlyNeeded, monthsToReach, futureValue, splitBill, dailyBudget,
} from '../src/lib/finance.ts';
import {
  weightedAverage, neededScore, bandFromScore, bandFromLetter, bandFromPoint, computeGpa, cumulativeGpa, gpaPredicate,
} from '../src/lib/school.ts';
import {
  parseYmd, daysBetween, calendarSpan, businessDays, weekdayName, nextBirthday, addDays, addMonths, splitDuration, daysInMonth,
} from '../src/lib/datetime.ts';
import { parseHex, rgbToHex, rgbToHsl, hslToRgb, parseColor, contrastRatio, gradientCss } from '../src/lib/color.ts';
import { normalizeDomain, validateTargetUrl, GuardError, rateLimit, getClientIp } from '../src/lib/server/guard.ts';
import { validateJson, formatJson, minifyJson, jsonStats, lineCol } from '../src/lib/json.ts';
import {
  wordStats, removeDuplicateLines, removeEmptyLines, capitalizeText, reverseText, sortLines, cleanText,
} from '../src/lib/text.ts';
import { formatXml, minifyXml } from '../src/lib/xml.ts';
import { getCategory, convertLinear, convertTemperature } from '../src/lib/units.ts';
import { randomInt, randomRange, shuffle, generatePassword, buildPools, entropyBits, strengthLabel, uuidv4, randomString } from '../src/lib/random.ts';
import { encodeBase64, decodeBase64, urlEncode, urlDecode, EncodingError, toHex } from '../src/lib/encoding.ts';

let passed = 0;
function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error('GAGAL:', name);
    throw e;
  }
}
const enc = (s: string) => new TextEncoder().encode(s);

// ---- math
t('math dasar', () => {
  assert.equal(evaluate('1+2*3'), 7);
  assert.equal(evaluate('(1+2)*3'), 9);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^-1'), 0.5);
  assert.equal(evaluate('10/4'), 2.5);
  assert.equal(evaluate('0.1+0.2'), 0.3);
  assert.equal(evaluate('50%'), 0.5);
  assert.equal(evaluate('200*10%'), 20);
  assert.equal(evaluate('10%3'), 1);
  assert.equal(evaluate('5!'), 120);
  assert.equal(evaluate('2π', 'rad'), parseFloat((2 * Math.PI).toPrecision(12)));
  assert.equal(evaluate('3(4+1)'), 15);
  assert.equal(evaluate('1e3+1'), 1001);
  assert.equal(evaluate('2e'), parseFloat((2 * Math.E).toPrecision(12)));
});
t('math fungsi', () => {
  assert.equal(evaluate('sin(30)', 'deg'), 0.5);
  assert.equal(evaluate('cos(90)', 'deg'), 0);
  assert.equal(evaluate('sin(180)', 'deg'), 0);
  assert.equal(evaluate('asin(1)', 'deg'), 90);
  assert.equal(evaluate('sqrt(144)'), 12);
  assert.equal(evaluate('√9'), 3);
  assert.equal(evaluate('log(1000)'), 3);
  assert.equal(evaluate('ln(e)'), 1);
  assert.equal(evaluate('pow(2,10)'), 1024);
  assert.equal(evaluate('max(1,5,3)'), 5);
  assert.equal(evaluate('mod(10,4)'), 2);
  assert.equal(evaluate('sin 30', 'deg'), 0.5);
});
t('math error', () => {
  assert.throws(() => evaluate('1/0'), MathError);
  assert.throws(() => evaluate('sqrt(-1)'), MathError);
  assert.throws(() => evaluate('(1+2'), MathError);
  assert.throws(() => evaluate(''), MathError);
  assert.throws(() => evaluate('2+*3'), MathError);
  assert.throws(() => evaluate('abc'), MathError);
  assert.throws(() => evaluate('tan(90)', 'deg'), MathError);
  assert.throws(() => evaluate('171!'), MathError);
  assert.throws(() => evaluate('alert(1)'), MathError);
});
t('math format', () => {
  assert.equal(formatResult(0.30000000000000004), '0.3');
  assert.equal(formatResult(1234567), '1234567');
  assert.equal(formatResult(1e20), '1e20');
});

// ---- ipv4
t('ipv4 parse', () => {
  assert.equal(parseIPv4('192.168.1.1'), 3232235777);
  assert.equal(parseIPv4('256.1.1.1'), null);
  assert.equal(parseIPv4('1.2.3'), null);
  assert.equal(parseIPv4('01.2.3.4'), null);
  assert.equal(parsePrefixOrMask('255.255.255.0'), 24);
  assert.equal(parsePrefixOrMask('/26'), 26);
  assert.equal(parsePrefixOrMask('255.0.255.0'), null);
  assert.equal(parsePrefixOrMask('33'), null);
});
t('ipv4 info', () => {
  const i = ipv4Info(parseIPv4('192.168.10.77')!, 26);
  assert.equal(i.network, '192.168.10.64');
  assert.equal(i.broadcast, '192.168.10.127');
  assert.equal(i.firstHost, '192.168.10.65');
  assert.equal(i.lastHost, '192.168.10.126');
  assert.equal(i.usableHosts, 62);
  assert.equal(i.mask, '255.255.255.192');
  assert.equal(i.wildcard, '0.0.0.63');
  assert.equal(i.ipClass, 'C');
  const z = ipv4Info(parseIPv4('10.0.0.5')!, 0);
  assert.equal(z.network, '0.0.0.0');
  assert.equal(z.broadcast, '255.255.255.255');
  assert.equal(z.totalAddresses, 4294967296);
  const p31 = ipv4Info(parseIPv4('10.0.0.4')!, 31);
  assert.equal(p31.usableHosts, 2);
  assert.equal(p31.firstHost, '10.0.0.4');
  const p32 = ipv4Info(parseIPv4('10.0.0.4')!, 32);
  assert.equal(p32.usableHosts, 1);
  assert.equal(p32.lastHost, '10.0.0.4');
});
t('ipv4 split + contains', () => {
  const s = splitIPv4(parseIPv4('192.168.0.0')!, 24, 26);
  assert.equal(s.total, 4);
  assert.equal(s.rows[1].network, '192.168.0.64');
  assert.equal(s.rows[3].broadcast, '192.168.0.255');
  assert.ok(ipv4InCidr(parseIPv4('192.168.0.200')!, parseIPv4('192.168.0.0')!, 24));
  assert.ok(!ipv4InCidr(parseIPv4('192.168.1.1')!, parseIPv4('192.168.0.0')!, 24));
});

t('range to cidr', () => {
  const r = (a: string, b: string) => rangeToCidrs(parseIPv4(a)!, parseIPv4(b)!).map((x) => x.cidr);
  assert.deepEqual(r('192.168.1.0', '192.168.1.255'), ['192.168.1.0/24']);
  assert.deepEqual(r('192.168.1.1', '192.168.1.6'), ['192.168.1.1/32', '192.168.1.2/31', '192.168.1.4/31', '192.168.1.6/32']);
  assert.deepEqual(r('10.0.0.0', '10.0.2.255'), ['10.0.0.0/23', '10.0.2.0/24']);
  assert.deepEqual(r('0.0.0.0', '255.255.255.255'), ['0.0.0.0/0']);
  assert.deepEqual(r('128.0.0.0', '255.255.255.255'), ['128.0.0.0/1']);
  assert.deepEqual(r('5.5.5.5', '5.5.5.5'), ['5.5.5.5/32']);
  assert.deepEqual(r('9.9.9.9', '9.9.9.1'), []);
  // total alamat harus sama dengan panjang rentang
  const a = parseIPv4('172.16.3.17')!;
  const b = parseIPv4('172.31.200.9')!;
  assert.equal(rangeToCidrs(a, b).reduce((n, x) => n + x.size, 0), b - a + 1);
});

// ---- ipv6
t('ipv6', () => {
  const a = parseIPv6('2001:db8::1')!;
  assert.equal(ipv6Full(a), '2001:0db8:0000:0000:0000:0000:0000:0001');
  assert.equal(ipv6Compressed(a), '2001:db8::1');
  assert.equal(ipv6Compressed(parseIPv6('::')!), '::');
  assert.equal(ipv6Compressed(parseIPv6('::1')!), '::1');
  assert.equal(ipv6Compressed(parseIPv6('fe80:0:0:0:1:0:0:1')!), 'fe80::1:0:0:1');
  assert.equal(ipv6Compressed(parseIPv6('1:0:0:2:0:0:0:3')!), '1:0:0:2::3');
  assert.equal(parseIPv6('::ffff:192.168.1.1'), 0xffffc0a80101n);
  assert.equal(parseIPv6('1::2::3'), null);
  assert.equal(parseIPv6('12345::1'), null);
  assert.equal(parseIPv6('1:2:3:4:5:6:7'), null);
  const info = ipv6Info(parseIPv6('2001:db8:abcd:12::5')!, 64);
  assert.equal(info.network, '2001:db8:abcd:12::/64');
  assert.equal(info.lastAddress, '2001:db8:abcd:12:ffff:ffff:ffff:ffff');
  assert.equal(info.totalAddresses, '18446744073709551616');
});

// ---- ssrf guard
t('ssrf guard', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', '::', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '224.0.0.1', 'not-an-ip']) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111', '93.184.216.34']) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

// ---- md5
t('md5', () => {
  assert.equal(md5(enc('')), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(md5(enc('abc')), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(md5(enc('The quick brown fox jumps over the lazy dog')), '9e107d9d372bb6826bd81d3542a419d6');
  assert.equal(md5(enc('a'.repeat(55))), 'ef1772b6dff9a122358552954ad0df65');
  assert.equal(md5(enc('a'.repeat(56))), '3b0c8ac703f828b04c6c197006d17218');
  assert.equal(md5(enc('a'.repeat(64))), '014842d480b571495a4a0363793f7367');
  assert.equal(md5(enc('12345678901234567890123456789012345678901234567890123456789012345678901234567890')), '57edf4a22be3c955ac49da2e2107b67a');
});

// ---- diff
t('diff', () => {
  const r = diffLines(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'e']);
  assert.equal(r.added, 2);
  assert.equal(r.removed, 1);
  assert.equal(r.unchanged, 3);
  assert.deepEqual(r.ops.map((o) => o.type + ':' + o.text), ['eq:a', 'del:b', 'add:x', 'eq:c', 'eq:d', 'add:e']);
  const same = diffLines(['1', '2'], ['1', '2']);
  assert.equal(same.added + same.removed, 0);
  const empty = diffLines([], ['x']);
  assert.equal(empty.added, 1);
});

t('diff normalize', () => {
  const r = diffLines(['Hello', 'World'], ['hello', 'there'], (l) => l.toLowerCase());
  assert.equal(r.unchanged, 1);
  assert.equal(r.removed, 1);
  assert.equal(r.added, 1);
  assert.equal(r.ops[0].text, 'hello'); // teks B ditampilkan untuk baris sama
});

// ---- json
t('json valid', () => {
  for (const ok of ['{}', '[]', '0', '-0.5e+10', '"a\\u00e9b"', 'true', 'null', ' [1, 2, {"a": [null, false]}] ', '{"a":{"b":{"c":1}}}', '"\\n"']) {
    assert.equal(validateJson(ok).ok, true, ok);
  }
});
t('json invalid + posisi', () => {
  const bad = (src: string, line: number, col: number, re: RegExp) => {
    const r = validateJson(src);
    assert.equal(r.ok, false, src);
    if (!r.ok) {
      assert.equal(r.line, line, src + ' baris');
      assert.equal(r.column, col, src + ' kolom');
      assert.match(r.message, re, src);
    }
  };
  bad('', 1, 1, /kosong/);
  bad('{"a":1,}', 1, 8, /trailing comma/);
  bad('[1,2,]', 1, 6, /trailing comma/);
  bad("{'a':1}", 1, 2, /kutip ganda/);
  bad('{a:1}', 1, 2, /kutip ganda/);
  bad('{"a":1', 1, 7, /berakhir terlalu cepat/);
  bad('{"a" 1}', 1, 6, /titik dua/);
  bad('{"a":1 "b":2}', 1, 8, /koma/);
  bad('[1 2]', 1, 4, /koma/);
  bad('{"a":undefined}', 1, 6, /undefined/);
  bad('[01]', 1, 2, /nol/);
  bad('[1.]', 1, 3, /desimal/);
  bad('"abc', 1, 1, /tidak ditutup/);
  bad('{"a":\n  "x"\n  "y"}', 3, 3, /koma/);
  bad('{} extra', 1, 4, /setelah nilai/);
  bad('// c\n{}', 1, 1, /Komentar/);
  bad('["a\\xb"]', 1, 4, /Escape/);
  bad('["a\tb"]'.replace('\\t', '\t'), 1, 4, /kontrol/);
  bad('[tru]', 1, 2, /tidak valid|Ditemukan/);
  bad('['.repeat(600), 1, 502, /terlalu dalam/);
  assert.deepEqual(lineCol('ab\ncd', 4), { line: 2, column: 2 });
});
t('json format', () => {
  const f = formatJson('{"b":1,"a":{"d":2,"c":3}}', 2, true);
  assert.equal(f.ok, true);
  assert.equal(f.output, '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}');
  assert.equal(formatJson('[1]', '\t').output, '[\n\t1\n]');
  assert.equal(minifyJson('{ "a" : [ 1 , 2 ] }').output, '{"a":[1,2]}');
  assert.equal(formatJson('{bad}', 2).ok, false);
  assert.equal(formatJson('{"id": 12345678901234567890}', 2).precisionWarning, true);
  assert.equal(formatJson('{"id": "12345678901234567890"}', 2).precisionWarning, false);
  const st = jsonStats('{"a":[1,{"b":2}],"c":3}');
  assert.equal(st.type, 'object');
  assert.equal(st.keys, 3);
  assert.equal(st.depth, 3);
});

// ---- user agent
t('user agent', () => {
  const chromeWin = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  assert.equal(chromeWin.browser?.name, 'Chrome');
  assert.equal(chromeWin.browser?.version, '120.0.0.0');
  assert.equal(chromeWin.engine?.name, 'Blink');
  assert.equal(chromeWin.os?.name, 'Windows');
  assert.equal(chromeWin.os?.version, '10 / 11');
  assert.equal(chromeWin.device.type, 'desktop');

  const edge = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91');
  assert.equal(edge.browser?.name, 'Edge');

  const opera = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0');
  assert.equal(opera.browser?.name, 'Opera');

  const samsung = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36');
  assert.equal(samsung.browser?.name, 'Samsung Internet');
  assert.equal(samsung.os?.name, 'Android');
  assert.equal(samsung.os?.version, '13');
  assert.equal(samsung.device.type, 'mobile');
  assert.equal(samsung.device.model, 'SM-S918B');
  assert.equal(samsung.device.vendor, 'Samsung');

  const pixel = parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36');
  assert.equal(pixel.device.model, 'Pixel 8');
  assert.equal(pixel.device.vendor, 'Google');

  const iphone = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1');
  assert.equal(iphone.browser?.name, 'Safari');
  assert.equal(iphone.browser?.version, '17.2');
  assert.equal(iphone.os?.name, 'iOS');
  assert.equal(iphone.os?.version, '17.2');
  assert.equal(iphone.engine?.name, 'WebKit');
  assert.equal(iphone.device.type, 'mobile');

  const crios = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1');
  assert.equal(crios.browser?.name, 'Chrome');
  assert.equal(crios.engine?.name, 'WebKit');

  const ipad = parseUserAgent('Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
  assert.equal(ipad.device.type, 'tablet');

  const ff = parseUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0');
  assert.equal(ff.browser?.name, 'Firefox');
  assert.equal(ff.engine?.name, 'Gecko');
  assert.equal(ff.os?.name, 'Linux');

  const mac = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15');
  assert.equal(mac.os?.name, 'macOS');
  assert.equal(mac.os?.version, '10.15.7');
  assert.equal(mac.browser?.name, 'Safari');

  const bot = parseUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  assert.equal(bot.isBot, true);
  assert.equal(bot.device.type, 'bot');

  const tabletAndroid = parseUserAgent('Mozilla/5.0 (Linux; Android 12; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  assert.equal(tabletAndroid.device.type, 'tablet');

  assert.equal(parseUserAgent('').browser, null);
  assert.equal(parseUserAgent('curl/8.0').browser, null);
});

// ---- guard (SSRF)
t('normalizeDomain', () => {
  assert.equal(normalizeDomain('Example.COM'), 'example.com');
  assert.equal(normalizeDomain(' example.com. '), 'example.com');
  assert.equal(normalizeDomain('sub.exa-mple.co.id'), 'sub.exa-mple.co.id');
  assert.equal(normalizeDomain('bücher.de'), 'xn--bcher-kva.de');
  for (const bad of ['', 'localhost', 'a', '127.0.0.1', '::1', 'foo.local', 'x.internal', 'svc.localhost', '-a.com', 'a-.com', 'a..com', 'a b.com', 'exa_mple.com', 'foo.123', 'a.b' + 'c'.repeat(70), ('a'.repeat(64)) + '.com', 'x.onion', 'http://a.com']) {
    assert.equal(normalizeDomain(bad), null, 'harus ditolak: ' + bad);
  }
});
t('validateTargetUrl', () => {
  assert.equal(validateTargetUrl('example.com').toString(), 'https://example.com/');
  assert.equal(validateTargetUrl('http://example.com:8080/x?y=1').port, '8080');
  assert.equal(validateTargetUrl('https://8.8.8.8').hostname, '8.8.8.8');
  const blocked = [
    'http://127.0.0.1', 'http://localhost', 'http://10.0.0.1', 'http://192.168.1.1', 'http://172.16.0.5',
    'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'http://[fe80::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://0.0.0.0', 'http://2130706433/', 'http://0x7f.1/', 'http://017700000001/', 'http://127.1/',
    'http://100.64.0.1', 'http://metadata.google.internal', 'http://foo.local',
  ];
  for (const u of blocked) {
    assert.throws(() => validateTargetUrl(u), GuardError, 'harus ditolak: ' + u);
  }
  assert.throws(() => validateTargetUrl('ftp://example.com'), GuardError);
  assert.throws(() => validateTargetUrl('file:///etc/passwd'), GuardError);
  assert.throws(() => validateTargetUrl('http://user:pass@example.com'), GuardError);
  assert.throws(() => validateTargetUrl('http://example.com:22'), GuardError);
  assert.throws(() => validateTargetUrl('http://example.com:3306'), GuardError);
  assert.throws(() => validateTargetUrl('javascript:alert(1)'), GuardError);
  assert.throws(() => validateTargetUrl('http://'), GuardError);
});
t('rateLimit + clientIp', () => {
  const k = 'k' + Math.random();
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(k, 3, 60000).ok, true);
  const r = rateLimit(k, 3, 60000);
  assert.equal(r.ok, false);
  assert.ok(r.retryAfter >= 1 && r.retryAfter <= 60);
  assert.equal(rateLimit(k + 'x', 3, 60000).ok, true);
  const req = (h: Record<string, string>) => new Request('http://x', { headers: h });
  assert.equal(getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assert.equal(getClientIp(req({ 'x-forwarded-for': '::ffff:5.6.7.8' })), '5.6.7.8');
  assert.equal(getClientIp(req({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9');
  assert.equal(getClientIp(req({})), null);
});

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

// ---- calc
t('fraction', () => {
  const f = (s: string) => parseFraction(s)!;
  assert.equal(fracToString(f('3/4')), '3/4');
  assert.equal(fracToString(f('1 1/2')), '3/2');
  assert.equal(fracToString(f('-2/6')), '-1/3');
  assert.equal(fracToString(f('0.75')), '3/4');
  assert.equal(fracToString(f('0,5')), '1/2');
  assert.equal(fracToString(f('5')), '5');
  assert.equal(fracToString(f('-1 1/2')), '-3/2');
  assert.equal(parseFraction('1/0'), null);
  assert.equal(parseFraction('abc'), null);
  assert.equal(parseFraction(''), null);
  assert.equal(fracToString(fracOp(f('1/2'), f('1/3'), '+')), '5/6');
  assert.equal(fracToString(fracOp(f('1/2'), f('3/4'), '-')), '-1/4');
  assert.equal(fracToString(fracOp(f('2/3'), f('3/4'), '×')), '1/2');
  assert.equal(fracToString(fracOp(f('1/2'), f('1/4'), '÷')), '2');
  assert.throws(() => fracOp(f('1/2'), f('0'), '÷'));
  assert.equal(fracToMixed(f('7/3')), '2 1/3');
  assert.equal(fracToMixed(f('-7/3')), '-2 1/3');
  assert.equal(fracToMixed(f('1/3')), '1/3');
  assert.equal(fracToDecimal(f('1/3'), 5), '0.33333…');
  assert.equal(fracToDecimal(f('3/4')), '0.75');
  assert.equal(fracToDecimal(f('-1/8')), '-0.125');
  assert.equal(fracToDecimal(f('4/2')), '2');
  // presisi besar tidak hilang
  assert.equal(fracToString(fracOp(f('999999999999/1'), f('999999999999/1'), '×')), '999999999998000000000001');
  assert.equal(gcd(12, 18), 6);
});
t('ratio + proportion', () => {
  assert.deepEqual(simplifyRatio([4, 6]), [2, 3]);
  assert.deepEqual(simplifyRatio([0.5, 1.5]), [1, 3]);
  assert.deepEqual(simplifyRatio([10, 20, 30]), [1, 2, 3]);
  assert.equal(simplifyRatio([0, 0]), null);
  assert.equal(simplifyRatio([1]), null);
  assert.equal(simplifyRatio([-1, 2]), null);
  assert.equal(solveProportion(2, 3, 10), 15);
  assert.equal(solveProportion(0, 3, 10), null);
});
t('stats', () => {
  const s = computeStats([1, 2, 2, 3, 4])!;
  near(s.mean, 2.4);
  assert.equal(s.median, 2);
  assert.deepEqual(s.modes, [2]);
  assert.equal(s.range, 3);
  near(s.variancePop, 1.04);
  near(s.varianceSample!, 1.3);
  near(s.stdPop, Math.sqrt(1.04));
  assert.equal(computeStats([1, 2, 3, 4])!.median, 2.5);
  assert.deepEqual(computeStats([1, 2, 3])!.modes, []);
  assert.deepEqual(computeStats([1, 1, 2, 2])!.modes, [1, 2]);
  assert.equal(computeStats([5])!.varianceSample, null);
  assert.equal(computeStats([]), null);
  assert.deepEqual(parseNumberList('1 2 3').numbers, [1, 2, 3]);
  assert.deepEqual(parseNumberList('1,5 2,5').numbers, [1.5, 2.5]);
  assert.deepEqual(parseNumberList('1,2,3').numbers, [1, 2, 3]);
  assert.deepEqual(parseNumberList('1; 2; x'), { numbers: [1, 2], invalid: ['x'] });
  assert.deepEqual(parseNumberList('  '), { numbers: [], invalid: [] });
  assert.deepEqual(parseNumberList('1e3 -2.5').numbers, [1000, -2.5]);
});
t('geometry', () => {
  const area = (id: string, v: Record<string, string>) => {
    const r = runShape(AREA_SHAPES.find((x) => x.id === id)!, v);
    assert.equal(r.ok, true, id);
    return r.ok ? r.results : [];
  };
  const vol = (id: string, v: Record<string, string>) => {
    const r = runShape(VOLUME_SHAPES.find((x) => x.id === id)!, v);
    assert.equal(r.ok, true, id);
    return r.ok ? r.results : [];
  };
  near(area('circle', { r: '1' })[0].value, Math.PI);
  near(area('circle', { r: '1' })[1].value, 2 * Math.PI);
  assert.equal(area('rectangle', { p: '3', l: '4' })[0].value, 12);
  assert.equal(area('rectangle', { p: '3', l: '4' })[1].value, 14);
  near(area('triangle3', { a: '3', b: '4', c: '5' })[0].value, 6);
  assert.equal(area('trapezoid', { a: '3', b: '5', t: '2' })[0].value, 8);
  assert.equal(area('rectangle', { p: '2,5', l: '2' })[0].value, 5);
  const bad = runShape(AREA_SHAPES.find((x) => x.id === 'triangle3')!, { a: '1', b: '2', c: '10' });
  assert.equal(bad.ok, false);
  assert.equal(runShape(AREA_SHAPES[0], { s: '' }).ok, false);
  assert.equal(runShape(AREA_SHAPES[0], { s: '-1' }).ok, false);
  assert.equal(runShape(AREA_SHAPES[0], { s: 'abc' }).ok, false);
  assert.deepEqual(vol('cube', { s: '2' }).map((r) => r.value), [8, 24]);
  near(vol('cylinder', { r: '1', t: '2' })[0].value, 2 * Math.PI);
  near(vol('cylinder', { r: '1', t: '2' })[1].value, 6 * Math.PI);
  near(vol('cone', { r: '3', t: '4' })[0].value, 12 * Math.PI);
  near(vol('cone', { r: '3', t: '4' })[1].value, 24 * Math.PI);
  near(vol('sphere', { r: '3' })[0].value, 36 * Math.PI);
  assert.deepEqual(vol('square-pyramid', { s: '6', t: '4' }).map((r) => r.value), [48, 96]);
  assert.equal(vol('cuboid', { p: '2', l: '3', t: '4' })[0].value, 24);
});

// ---- finance
t('finance basic', () => {
  assert.deepEqual(applyDiscount(200000, 25), { discount: 50000, final: 150000 });
  const td = tieredDiscount(1000, [20, 10]);
  near(td.final, 720);
  near(td.effectivePct, 28);
  assert.equal(td.steps.length, 2);
  const a = discountPlusTax(1000, 10, 11, 'after');
  near(a.total, 999);
  near(a.tax, 99);
  near(discountPlusTax(1000, 10, 11, 'before').total, 1010);
  const p = profitLoss(80, 100);
  near(p.diff, 20);
  near(p.markupPct!, 25);
  near(p.marginPct!, 20);
  const l = profitLoss(100, 80);
  assert.equal(l.isLoss, true);
  near(l.markupPct!, -20);
  near(l.marginPct!, -25);
  assert.equal(profitLoss(0, 10).markupPct, null);
  near(sellFromMarkup(80, 25), 100);
  near(sellFromMargin(80, 20)!, 100);
  assert.equal(sellFromMargin(80, 100), null);
  near(percentChange(50, 75)!, 50);
  near(percentChange(100, 80)!, -20);
  assert.equal(percentChange(0, 5), null);
});
t('installment', () => {
  const an = installmentAnnuity(12_000_000, 12, 12);
  assert.ok(Math.abs(an.monthly - 1066185.5) < 1, 'anuitas ' + an.monthly);
  assert.equal(an.rows.length, 12);
  assert.equal(an.rows[11].balance, 0);
  near(an.rows.reduce((n, r) => n + r.principal, 0), 12_000_000, 1e-4);
  near(an.totalInterest, an.monthly * 12 - 12_000_000, 1e-6);
  near(installmentAnnuity(1200, 0, 12).monthly, 100);
  const fl = installmentFlat(12_000_000, 12, 12);
  near(fl.totalInterest, 1_440_000);
  near(fl.monthly, 1_120_000);
  near(fl.totalPaid, 13_440_000);
  assert.equal(fl.rows[11].balance, 0);
});
t('savings + split + budget', () => {
  near(monthlyNeeded(12000, 0, 12, 0), 1000);
  near(monthlyNeeded(12000, 6000, 12, 0), 500);
  assert.equal(monthlyNeeded(1000, 2000, 12, 0), 0);
  assert.ok(Math.abs(monthlyNeeded(12000, 0, 12, 12) - 946.2) < 0.2);
  assert.equal(monthsToReach(1000, 0, 100, 0), 10);
  assert.equal(monthsToReach(1000, 2000, 0, 0), 0);
  assert.equal(monthsToReach(1000, 0, 0, 0), null);
  assert.equal(monthsToReach(1000, 0, 0, 12), null);
  assert.ok(monthsToReach(1000, 0, 100, 12)! <= 10);
  near(futureValue(0, 100, 12, 0), 1200);
  const sb = splitBill(300000, 5, 10, 0, 3, 1000);
  near(sb.service, 15000);
  near(sb.tax, 31500);
  near(sb.total, 346500);
  near(sb.perPerson, 115500);
  assert.equal(sb.perPersonRounded, 116000);
  near(sb.surplus, 1500);
  near(splitBill(100, 0, 0, 0, 4, 1).perPersonRounded, 25);
  const db = dailyBudget(3_000_000, 1_000_000, 10, 500_000);
  near(db.available, 1_500_000);
  near(db.perDay, 150_000);
  near(db.perWeek, 1_050_000);
});

// ---- school
t('school', () => {
  near(weightedAverage([{ score: 80, weight: 2 }, { score: 90, weight: 3 }])!, 86);
  assert.equal(weightedAverage([{ score: 80, weight: 0 }]), null);
  near(neededScore([{ score: 80, weight: 30 }, { score: 70, weight: 30 }], 40, 75)!, 75);
  assert.ok(neededScore([{ score: 50, weight: 60 }], 40, 90)! > 100); // mustahil
  assert.equal(neededScore([], 0, 80), null);
  assert.equal(bandFromScore(85).letter, 'A');
  assert.equal(bandFromScore(84.9).letter, 'A-');
  assert.equal(bandFromScore(39).letter, 'E');
  assert.equal(bandFromScore(120).letter, 'A');
  assert.equal(bandFromScore(-5).letter, 'E');
  assert.equal(bandFromLetter('b+')!.point, 3.3);
  assert.equal(bandFromLetter('Z'), null);
  assert.equal(bandFromPoint(3.5).letter, 'B+');
  assert.equal(bandFromPoint(4).letter, 'A');
  assert.equal(bandFromPoint(0).letter, 'E');
  const g = computeGpa([{ credits: 3, point: 4 }, { credits: 2, point: 3 }, { credits: 3, point: 2 }])!;
  near(g.gpa, 3);
  assert.equal(g.credits, 8);
  assert.equal(computeGpa([]), null);
  near(cumulativeGpa(3.0, 60, { gpa: 4.0, credits: 20 })!, 3.25);
  assert.match(gpaPredicate(3.6), /Cum laude/);
  assert.match(gpaPredicate(3.0), /Sangat memuaskan/);
  assert.match(gpaPredicate(1.5), /Di bawah/);
});

// ---- datetime
t('datetime', () => {
  assert.ok(parseYmd('2024-02-29'));
  assert.equal(parseYmd('2023-02-29'), null);
  assert.equal(parseYmd('2024-13-01'), null);
  assert.equal(parseYmd('2024-1-1'), null);
  const y = (s: string) => parseYmd(s)!;
  assert.equal(daysBetween(y('2024-01-01'), y('2024-12-31')), 365);
  assert.equal(daysBetween(y('2023-01-01'), y('2023-12-31')), 364);
  assert.equal(daysBetween(y('2024-03-01'), y('2024-02-01')), -29);
  assert.equal(daysBetween(y('2024-03-30'), y('2024-03-31')), 1); // melewati DST di banyak zona waktu
  assert.deepEqual(calendarSpan(y('2000-01-15'), y('2024-06-20')), { years: 24, months: 5, days: 5 });
  assert.deepEqual(calendarSpan(y('1990-05-20'), y('2024-05-19')), { years: 33, months: 11, days: 29 });
  assert.deepEqual(calendarSpan(y('2000-01-31'), y('2000-03-01')), { years: 0, months: 1, days: 1 });
  assert.deepEqual(calendarSpan(y('2023-12-31'), y('2024-01-01')), { years: 0, months: 0, days: 1 });
  assert.deepEqual(calendarSpan(y('2024-05-05'), y('2024-05-05')), { years: 0, months: 0, days: 0 });
  assert.deepEqual(calendarSpan(y('2000-02-29'), y('2001-02-28')), { years: 0, months: 11, days: 30 });
  assert.throws(() => calendarSpan(y('2024-02-01'), y('2024-01-01')), RangeError);
  assert.deepEqual(addMonths(y('2024-01-31'), 1), { y: 2024, m: 2, d: 29 });
  assert.deepEqual(addMonths(y('2023-01-31'), 1), { y: 2023, m: 2, d: 28 });
  assert.deepEqual(addMonths(y('2024-11-15'), 3), { y: 2025, m: 2, d: 15 });
  assert.deepEqual(addMonths(y('2024-03-15'), -3), { y: 2023, m: 12, d: 15 });
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(businessDays(y('2024-01-01'), y('2024-01-07'), true), 5);
  assert.equal(businessDays(y('2024-01-01'), y('2024-01-08'), false), 5);
  assert.equal(businessDays(y('2024-01-01'), y('2024-01-08'), true), 6);
  assert.equal(businessDays(y('2024-01-08'), y('2024-01-01'), true), 6); // tertukar → otomatis
  assert.equal(weekdayName(y('2024-01-01')), 'Senin');
  assert.equal(weekdayName(y('2026-10-07')), 'Rabu');
  const b0 = nextBirthday(y('2000-02-29'), y('2023-03-01'));
  assert.deepEqual([b0.date.m, b0.date.d, b0.daysLeft, b0.turning], [3, 1, 0, 23]);
  const b1 = nextBirthday(y('2000-02-29'), y('2023-03-02'));
  assert.deepEqual([b1.date.y, b1.date.m, b1.date.d, b1.turning], [2024, 2, 29, 24]);
  const b2 = nextBirthday(y('1995-10-06'), y('2026-10-07'));
  assert.deepEqual([b2.date.y, b2.daysLeft, b2.turning], [2027, 364, 32]);
  assert.equal(nextBirthday(y('1995-10-07'), y('2026-10-07')).daysLeft, 0);
  assert.deepEqual(addDays(y('2024-02-28'), 2), { y: 2024, m: 3, d: 1 });
  assert.deepEqual(addDays(y('2023-12-31'), 1), { y: 2024, m: 1, d: 1 });
  assert.deepEqual(splitDuration(93784), { d: 1, h: 2, m: 3, s: 4 });
  assert.deepEqual(splitDuration(-5), { d: 0, h: 0, m: 0, s: 0 });
});

// ---- color
t('color', () => {
  assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseHex('1a2b3c'), { r: 26, g: 43, b: 60 });
  assert.equal(parseHex('#12345678')!.a, 0.47);
  assert.equal(parseHex('xyz'), null);
  assert.equal(parseHex('12'), null);
  assert.equal(parseHex('#12345'), null);
  assert.equal(rgbToHex({ r: 255, g: 0, b: 128 }), '#ff0080');
  assert.equal(rgbToHex({ r: 300, g: -5, b: 0.4 }), '#ff0000');
  assert.deepEqual(rgbToHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
  assert.deepEqual(rgbToHsl({ r: 0, g: 0, b: 255 }), { h: 240, s: 100, l: 50 });
  assert.deepEqual(rgbToHsl({ r: 128, g: 128, b: 128 }), { h: 0, s: 0, l: 50 });
  assert.deepEqual(hslToRgb({ h: 120, s: 100, l: 50 }), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hslToRgb({ h: 0, s: 0, l: 50 }), { r: 128, g: 128, b: 128 });
  assert.deepEqual(hslToRgb({ h: 360, s: 100, l: 50 }), { r: 255, g: 0, b: 0 });
  for (const c of [{ r: 10, g: 200, b: 99 }, { r: 250, g: 128, b: 5 }, { r: 33, g: 33, b: 200 }]) {
    const back = hslToRgb(rgbToHsl(c));
    assert.ok(Math.abs(back.r - c.r) <= 3 && Math.abs(back.g - c.g) <= 3 && Math.abs(back.b - c.b) <= 3, JSON.stringify(c));
  }
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30 });
  assert.deepEqual(parseColor('10,20,30'), { r: 10, g: 20, b: 30 });
  assert.deepEqual(parseColor('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0 });
  assert.deepEqual(parseColor('#abc'), { r: 170, g: 187, b: 204 });
  assert.equal(parseColor('10,20,300'), null);
  assert.equal(parseColor('rgb(1,2)'), null);
  near(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21, 0.01);
  near(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }), 1);
  assert.equal(gradientCss('linear', 90, [{ color: '#000', pos: 100 }, { color: '#fff', pos: 0 }]), 'linear-gradient(90deg, #fff 0%, #000 100%)');
  assert.match(gradientCss('radial', 0, [{ color: 'red', pos: 0 }, { color: 'blue', pos: 100 }]), /^radial-gradient\(circle at center/);
});

// ---- text
t('text', () => {
  const s = wordStats('Halo dunia. Apa kabar?\n\nBaik sekali!');
  assert.equal(s.words, 6);
  assert.equal(s.sentences, 3);
  assert.equal(s.paragraphs, 2);
  assert.equal(s.lines, 3);
  assert.equal(wordStats('').words, 0);
  assert.equal(wordStats('😀 a').characters, 3);
  assert.equal(removeDuplicateLines('a\nA\nb\na', { caseSensitive: false, trim: true, keepEmpty: false }), 'a\nb');
  assert.equal(removeDuplicateLines('a\nA\nb\na', { caseSensitive: true, trim: true, keepEmpty: false }), 'a\nA\nb');
  assert.equal(removeEmptyLines('a\n\n  \nb', { treatWhitespaceAsEmpty: true, collapseOnly: false }), 'a\nb');
  assert.equal(removeEmptyLines('a\n\n\n\nb', { treatWhitespaceAsEmpty: true, collapseOnly: true }), 'a\n\nb');
  assert.equal(capitalizeText('hELLO woRLD. nice-day', 'words'), 'Hello World. Nice-Day');
  assert.equal(capitalizeText('hELLO woRLD. nice day', 'sentences'), 'Hello world. Nice day');
  assert.equal(reverseText('abc def', 'characters'), 'fed cba');
  assert.equal(reverseText('abc def', 'words'), 'def abc');
  assert.equal(reverseText('1\n2\n3', 'lines'), '3\n2\n1');
  assert.equal(sortLines('b\na\nC', { order: 'asc', ignoreCase: true, natural: false, removeEmpty: false }), 'a\nb\nC');
  assert.equal(sortLines('a10\na2\na1', { order: 'asc', ignoreCase: false, natural: true, removeEmpty: false }), 'a1\na2\na10');
  assert.equal(sortLines('a\nb', { order: 'desc', ignoreCase: false, natural: false, removeEmpty: false }), 'b\na');
  assert.equal(
    cleanText('  <b>Hi</b>   “you”  \n\n\n\nx ', { trimLines: true, collapseSpaces: true, collapseBlankLines: true, stripHtml: true, straightQuotes: true, removeZeroWidth: true }),
    'Hi "you"\n\nx',
  );
});

// ---- xml
t('xml', () => {
  const out = formatXml('<?xml version="1.0"?><a><b x="1">hi</b><c/><d><e>1</e></d></a>');
  assert.equal(out, ['<?xml version="1.0"?>', '<a>', '  <b x="1">hi</b>', '  <c/>', '  <d>', '    <e>1</e>', '  </d>', '</a>'].join('\n'));
  assert.equal(minifyXml('<a>\n  <b>1</b>\n  <!-- x -->\n</a>'), '<a><b>1</b></a>');
});

// ---- units
t('units', () => {
  const len = getCategory('length');
  const km = len.units.find((u) => u.id === 'km')!;
  const mi = len.units.find((u) => u.id === 'mi')!;
  assert.ok(Math.abs(convertLinear(1, mi, km) - 1.609344) < 1e-9);
  const data = getCategory('data');
  const gib = data.units.find((u) => u.id === 'GiB')!;
  const mb = data.units.find((u) => u.id === 'MB')!;
  assert.ok(Math.abs(convertLinear(1, gib, mb) - 1073.741824) < 1e-6);
  assert.equal(convertTemperature(100, 'C', 'F'), 212);
  assert.equal(convertTemperature(32, 'F', 'C'), 0);
  assert.ok(Math.abs(convertTemperature(0, 'C', 'K') - 273.15) < 1e-9);
  assert.ok(Math.abs(convertTemperature(-40, 'C', 'F') + 40) < 1e-9);
});

// ---- random
t('random', () => {
  const counts = new Array(6).fill(0);
  for (let i = 0; i < 6000; i++) counts[randomInt(6)]++;
  for (const c of counts) assert.ok(c > 800 && c < 1200, 'distribusi dadu: ' + counts.join(','));
  for (let i = 0; i < 200; i++) {
    const v = randomRange(-5, 5);
    assert.ok(v >= -5 && v <= 5 && Number.isInteger(v));
  }
  assert.equal(randomRange(7, 7), 7);
  const big = randomRange(0, 2 ** 40);
  assert.ok(big >= 0 && big <= 2 ** 40 && Number.isInteger(big));
  assert.throws(() => randomInt(0), RangeError);
  assert.throws(() => randomRange(5, 1), RangeError);
  assert.deepEqual(shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
  assert.equal(randomString(12, 'ab').length, 12);
  assert.match(uuidv4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
t('password', () => {
  const o = { length: 16, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: true };
  for (let i = 0; i < 100; i++) {
    const p = generatePassword(o);
    assert.equal(Array.from(p).length, 16);
    assert.match(p, /[a-z]/);
    assert.match(p, /[A-Z]/);
    assert.match(p, /[0-9]/);
    assert.match(p, /[^a-zA-Z0-9]/);
    assert.doesNotMatch(p, /[Il1O0o|`'"]/);
  }
  assert.throws(() => generatePassword({ ...o, lower: false, upper: false, digits: false, symbols: false }));
  assert.throws(() => generatePassword({ ...o, length: 3 }));
  assert.equal(buildPools({ ...o, exclude: 'abcdefghijklmnopqrstuvwxyz', excludeAmbiguous: false, upper: false, digits: false, symbols: false }).length, 0);
  assert.equal(Math.round(entropyBits(10, 64)), 60);
  assert.equal(strengthLabel(30).level, 0);
  assert.equal(strengthLabel(120).level, 4);
});

// ---- encoding
t('base64', () => {
  assert.equal(encodeBase64('Halo dunia 👋'), 'SGFsbyBkdW5pYSDwn5GL');
  assert.equal(decodeBase64('SGFsbyBkdW5pYSDwn5GL'), 'Halo dunia 👋');
  assert.equal(decodeBase64('SGFsbyBkdW5pYSDwn5GL\n'), 'Halo dunia 👋');
  assert.equal(decodeBase64('SGk'), 'Hi');
  assert.equal(encodeBase64('Hi', { padding: false }), 'SGk');
  assert.equal(encodeBase64('???>>>', { urlSafe: true }), 'Pz8_Pj4-');
  assert.equal(decodeBase64('Pz8_Pj4-'), '???>>>');
  assert.equal(decodeBase64('data:text/plain;base64,SGk='), 'Hi');
  assert.equal(decodeBase64(''), '');
  assert.throws(() => decodeBase64('***'), EncodingError);
  assert.throws(() => decodeBase64('A'), EncodingError);
  assert.throws(() => decodeBase64('/w=='), EncodingError); // byte 0xFF bukan UTF-8
  assert.equal(toHex(new Uint8Array([0, 15, 255])), '000fff');
});
t('url encoding', () => {
  assert.equal(urlEncode('a b&c=d/é', 'component'), 'a%20b%26c%3Dd%2F%C3%A9');
  assert.equal(urlEncode('https://x.com/a b?q=é', 'full'), 'https://x.com/a%20b?q=%C3%A9');
  assert.equal(urlDecode('a%20b%26c', 'component', false), 'a b&c');
  assert.equal(urlDecode('a+b', 'component', true), 'a b');
  assert.equal(urlDecode('a+b', 'component', false), 'a+b');
  assert.throws(() => urlDecode('%E0%A4%A', 'component', false), EncodingError);
  assert.throws(() => urlEncode('\uD800', 'component'), EncodingError);
});

console.log(`OK — ${passed} grup tes lulus`);
