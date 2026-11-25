// Parser User-Agent ringan (tanpa dependensi). Urutan deteksi penting: browser turunan Chromium
// (Edge, Opera, Samsung, dst.) mengandung kata "Chrome", jadi harus dicek lebih dulu.

export interface UAInfo {
  browser: { name: string; version: string } | null;
  engine: { name: string; version: string } | null;
  os: { name: string; version: string } | null;
  device: { type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'; vendor: string | null; model: string | null };
  isBot: boolean;
}

const BROWSERS: [RegExp, string][] = [
  [/(?:Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Applebot|AhrefsBot|SemrushBot)\/?([\d.]*)/i, 'Bot'],
  [/EdgiOS\/([\d.]+)/, 'Edge'],
  [/EdgA\/([\d.]+)/, 'Edge'],
  [/Edg(?:e)?\/([\d.]+)/, 'Edge'],
  [/OPR\/([\d.]+)/, 'Opera'],
  [/OPT\/([\d.]+)/, 'Opera Touch'],
  [/Opera(?:\/| )([\d.]+)/, 'Opera'],
  [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/UCBrowser\/([\d.]+)/, 'UC Browser'],
  [/(?:Vivaldi)\/([\d.]+)/, 'Vivaldi'],
  [/YaBrowser\/([\d.]+)/, 'Yandex Browser'],
  [/DuckDuckGo\/([\d.]+)/, 'DuckDuckGo'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/FxiOS\/([\d.]+)/, 'Firefox'],
  [/CriOS\/([\d.]+)/, 'Chrome'],
  [/HeadlessChrome\/([\d.]+)/, 'Headless Chrome'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Chromium\/([\d.]+)/, 'Chromium'],
  [/(?:MSIE |rv:)([\d.]+)\) like Gecko/, 'Internet Explorer'],
  [/MSIE ([\d.]+)/, 'Internet Explorer'],
  [/Trident\/.*rv:([\d.]+)/, 'Internet Explorer'],
  [/Version\/([\d.]+).*Safari\//, 'Safari'],
  [/Safari\/([\d.]+)/, 'Safari'],
];

const WINDOWS: Record<string, string> = {
  '10.0': '10 / 11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
  '5.2': 'XP x64',
};

function clean(v: string): string {
  return v.replace(/_/g, '.');
}

export function parseUserAgent(ua: string): UAInfo {
  const s = ua.trim();
  const out: UAInfo = {
    browser: null,
    engine: null,
    os: null,
    device: { type: 'unknown', vendor: null, model: null },
    isBot: false,
  };
  if (!s) return out;

  for (const [re, name] of BROWSERS) {
    const m = re.exec(s);
    if (m) {
      out.browser = { name, version: m[1] ?? '' };
      break;
    }
  }
  out.isBot = out.browser?.name === 'Bot' || /\b(bot|crawler|spider|crawling)\b/i.test(s);

  // Engine
  let m: RegExpExecArray | null;
  if ((m = /Trident\/([\d.]+)/.exec(s))) out.engine = { name: 'Trident', version: m[1] };
  else if (/Firefox\/|FxiOS\//.test(s) && !/Seamonkey/i.test(s)) {
    m = /(?:Firefox|FxiOS)\/([\d.]+)/.exec(s);
    // Firefox di iOS memakai WebKit
    out.engine = /FxiOS\//.test(s) ? { name: 'WebKit', version: /AppleWebKit\/([\d.]+)/.exec(s)?.[1] ?? '' } : { name: 'Gecko', version: m?.[1] ?? '' };
  } else if (/CriOS\/|EdgiOS\//.test(s)) out.engine = { name: 'WebKit', version: /AppleWebKit\/([\d.]+)/.exec(s)?.[1] ?? '' };
  else if (/(?:Chrome|Chromium|Edg|EdgA|OPR|SamsungBrowser|UCBrowser|Vivaldi|YaBrowser)\//.test(s)) {
    out.engine = { name: 'Blink', version: /(?:Chrome|Chromium)\/([\d.]+)/.exec(s)?.[1] ?? '' };
  } else if ((m = /AppleWebKit\/([\d.]+)/.exec(s))) out.engine = { name: 'WebKit', version: m[1] };

  // OS
  if ((m = /Windows NT ([\d.]+)/.exec(s))) out.os = { name: 'Windows', version: WINDOWS[m[1]] ?? m[1] };
  else if (/Windows Phone/.test(s)) out.os = { name: 'Windows Phone', version: /Windows Phone (?:OS )?([\d.]+)/.exec(s)?.[1] ?? '' };
  else if ((m = /(?:iPhone|CPU) OS ([\d_]+)/.exec(s)) || (m = /iPad.*OS ([\d_]+)/.exec(s))) out.os = { name: /iPad/.test(s) ? 'iPadOS' : 'iOS', version: clean(m[1]) };
  else if (/iPhone|iPad|iPod/.test(s)) out.os = { name: 'iOS', version: '' };
  else if ((m = /Android[ /]([\d.]+)/.exec(s))) out.os = { name: 'Android', version: m[1] };
  else if (/Android/.test(s)) out.os = { name: 'Android', version: '' };
  else if ((m = /Mac OS X ([\d_.]+)/.exec(s))) out.os = { name: 'macOS', version: clean(m[1]) };
  else if (/CrOS/.test(s)) out.os = { name: 'Chrome OS', version: /CrOS \S+ ([\d.]+)/.exec(s)?.[1] ?? '' };
  else if (/Ubuntu/.test(s)) out.os = { name: 'Ubuntu', version: '' };
  else if (/Linux/.test(s)) out.os = { name: 'Linux', version: '' };

  // Device
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/.test(s) && !/Mobile/.test(s));
  const isMobile = /Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini/i.test(s);
  if (out.isBot) out.device.type = 'bot';
  else if (isTablet) out.device.type = 'tablet';
  else if (isMobile) out.device.type = 'mobile';
  else if (out.os) out.device.type = 'desktop';

  if (/iPhone/.test(s)) Object.assign(out.device, { vendor: 'Apple', model: 'iPhone' });
  else if (/iPad/.test(s)) Object.assign(out.device, { vendor: 'Apple', model: 'iPad' });
  else if (/Macintosh/.test(s)) Object.assign(out.device, { vendor: 'Apple', model: 'Mac' });
  else if ((m = /Android [\d.]+; ([^;)]+?)(?: Build\/|\)|;)/.exec(s))) {
    const model = m[1].trim();
    if (model && model !== 'K' && !/^wv$/i.test(model)) {
      out.device.model = model;
      if (/^(SM-|GT-|SAMSUNG)/i.test(model)) out.device.vendor = 'Samsung';
      else if (/^(Pixel|Nexus)/i.test(model)) out.device.vendor = 'Google';
      else if (/^(Redmi|Mi |M\d{4}|POCO|2\d{6,}[A-Z]*)/i.test(model)) out.device.vendor = 'Xiaomi';
      else if (/^(CPH|RMX|OPPO)/i.test(model)) out.device.vendor = /^RMX/i.test(model) ? 'Realme' : 'OPPO';
      else if (/^(vivo|V\d{4})/i.test(model)) out.device.vendor = 'vivo';
      else if (/^(ONEPLUS|[A-Z]{2}\d{4}$)/i.test(model)) out.device.vendor = 'OnePlus';
      else if (/^(INFINIX|X\d{3,4})/i.test(model)) out.device.vendor = 'Infinix';
      else if (/^(HUAWEI|[A-Z]{3}-[A-Z]{1,2}\d{2})/i.test(model)) out.device.vendor = 'Huawei';
    }
  }
  return out;
}
