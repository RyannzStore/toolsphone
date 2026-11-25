// Konversi warna HEX / RGB / HSL dan utilitas gradient.

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function parseHex(input: string): (RGB & { a?: number }) | null {
  let h = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;
  if (h.length === 3 || h.length === 4) h = Array.from(h, (c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const out: RGB & { a?: number } = {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
  if (h.length === 8) out.a = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100;
  return out;
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(f(hn + 1 / 3) * 255), g: Math.round(f(hn) * 255), b: Math.round(f(hn - 1 / 3) * 255) };
}

/** Terima "rgb(1, 2, 3)", "1,2,3", "hsl(200, 50%, 40%)". */
export function parseColor(input: string): RGB | null {
  const s = input.trim();
  const hex = parseHex(s);
  if (hex) return { r: hex.r, g: hex.g, b: hex.b };
  let m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i.exec(s) ?? /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/.exec(s);
  if (m) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return r <= 255 && g <= 255 && b <= 255 ? { r, g, b } : null;
  }
  m = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i.exec(s);
  if (m) {
    const [h, sat, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return sat <= 100 && l <= 100 ? hslToRgb({ h, s: sat, l }) : null;
  }
  return null;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rasio kontras WCAG antara dua warna (1–21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface GradientStop {
  color: string;
  pos: number;
}

export function gradientCss(type: 'linear' | 'radial' | 'conic', angle: number, stops: GradientStop[]): string {
  const sorted = stops.slice().sort((a, b) => a.pos - b.pos);
  const list = sorted.map((s) => `${s.color} ${clamp(Math.round(s.pos), 0, 100)}%`).join(', ');
  if (type === 'linear') return `linear-gradient(${Math.round(angle)}deg, ${list})`;
  if (type === 'radial') return `radial-gradient(circle at center, ${list})`;
  return `conic-gradient(from ${Math.round(angle)}deg at 50% 50%, ${list})`;
}
