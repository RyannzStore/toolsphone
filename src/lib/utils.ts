export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

const ID = 'id-ID';

export function formatDate(input: string | number | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(ID, { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
}

export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(ID, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** "5 menit lalu", "kemarin", dst. */
export function timeAgo(input: string | number | Date): string {
  const d = new Date(input).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Math.round((Date.now() - d) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 2) return 'kemarin';
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(d);
}

export function formatBytes(bytes: number, digits = 2): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** i).toFixed(digits))} ${units[i]}`;
}

/** Hanya izinkan redirect ke path internal ("/foo"), bukan "//evil.com" atau "http://...". */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = Array.from(parts[0])[0] ?? '?';
  const second = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + second).toUpperCase();
}
