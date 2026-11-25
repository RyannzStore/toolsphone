// Base64 / URL encoding yang aman untuk UTF-8 (btoa/atob bawaan hanya Latin-1).

export class EncodingError extends Error {}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeBase64(text: string, opts: { urlSafe?: boolean; padding?: boolean } = {}): string {
  let b = bytesToBase64(new TextEncoder().encode(text));
  if (opts.urlSafe) b = b.replace(/\+/g, '-').replace(/\//g, '_');
  if (opts.padding === false) b = b.replace(/=+$/, '');
  return b;
}

export function decodeBase64(input: string): string {
  let s = input.trim();
  // Terima data URL: data:text/plain;base64,XXXX
  const m = /^data:[^,]*;base64,/i.exec(s);
  if (m) s = s.slice(m[0].length);
  s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (s === '') return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new EncodingError('Input bukan Base64 yang valid (ada karakter terlarang).');
  if (s.length % 4 === 1) throw new EncodingError('Panjang Base64 tidak valid.');
  while (s.length % 4 !== 0) s += '=';
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(s);
  } catch {
    throw new EncodingError('Base64 tidak bisa didecode.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new EncodingError('Hasil decode bukan teks UTF-8 (kemungkinan data biner).');
  }
}

export function urlEncode(text: string, mode: 'component' | 'full'): string {
  try {
    return mode === 'component' ? encodeURIComponent(text) : encodeURI(text);
  } catch {
    throw new EncodingError('Teks mengandung karakter surrogate yang tidak lengkap.');
  }
}

export function urlDecode(text: string, mode: 'component' | 'full', plusAsSpace: boolean): string {
  const src = plusAsSpace ? text.replace(/\+/g, ' ') : text;
  try {
    return mode === 'component' ? decodeURIComponent(src) : decodeURI(src);
  } catch {
    throw new EncodingError('Format persen (%XX) tidak valid atau bukan UTF-8.');
  }
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
}
