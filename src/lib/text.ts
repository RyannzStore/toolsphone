// Fungsi teks murni — dipakai oleh tool kategori Text.

export interface WordStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  bytes: number;
  readingMinutes: number;
  speakingMinutes: number;
}

export function wordStats(text: string): WordStats {
  const trimmed = text.trim();
  const words = trimmed ? (trimmed.match(/\S+/g) ?? []).length : 0;
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s/g, '')).length;
  const sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? []).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
  const bytes = new TextEncoder().encode(text).length;
  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    bytes,
    readingMinutes: words / 200,
    speakingMinutes: words / 130,
  };
}

const splitLines = (t: string): string[] => t.split(/\r\n|\r|\n/);

export function removeDuplicateLines(
  text: string,
  opts: { caseSensitive: boolean; trim: boolean; keepEmpty: boolean },
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of splitLines(text)) {
    let key = opts.trim ? line.trim() : line;
    if (!opts.caseSensitive) key = key.toLowerCase();
    if (key === '' && opts.keepEmpty) {
      out.push(line);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opts.trim ? line.trim() : line);
  }
  return out.join('\n');
}

export function removeEmptyLines(text: string, opts: { treatWhitespaceAsEmpty: boolean; collapseOnly: boolean }): string {
  const lines = splitLines(text);
  const isEmpty = (l: string) => (opts.treatWhitespaceAsEmpty ? l.trim() === '' : l === '');
  if (opts.collapseOnly) {
    const out: string[] = [];
    for (const l of lines) {
      if (isEmpty(l) && out.length && isEmpty(out[out.length - 1])) continue;
      out.push(l);
    }
    return out.join('\n');
  }
  return lines.filter((l) => !isEmpty(l)).join('\n');
}

export function capitalizeText(text: string, mode: 'words' | 'sentences'): string {
  const lower = text.toLowerCase();
  if (mode === 'words') {
    return lower.replace(/(^|[\s\-_/("“])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
  }
  return lower.replace(/(^|[.!?]\s+|\n\s*)(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
}

export function reverseText(text: string, mode: 'characters' | 'words' | 'lines'): string {
  if (mode === 'characters') return Array.from(text).reverse().join('');
  if (mode === 'words') {
    return splitLines(text)
      .map((l) => l.split(/(\s+)/).filter((x) => x !== '').reverse().join(''))
      .join('\n');
  }
  return splitLines(text).reverse().join('\n');
}

export function sortLines(
  text: string,
  opts: { order: 'asc' | 'desc' | 'length' | 'random'; ignoreCase: boolean; natural: boolean; removeEmpty: boolean },
): string {
  let lines = splitLines(text);
  if (opts.removeEmpty) lines = lines.filter((l) => l.trim() !== '');
  if (opts.order === 'random') {
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    return lines.join('\n');
  }
  const cmp = (a: string, b: string) =>
    a.localeCompare(b, 'id', { numeric: opts.natural, sensitivity: opts.ignoreCase ? 'accent' : 'variant' });
  if (opts.order === 'length') lines.sort((a, b) => a.length - b.length || cmp(a, b));
  else lines.sort(cmp);
  if (opts.order === 'desc') lines.reverse();
  return lines.join('\n');
}

export function cleanText(
  text: string,
  opts: {
    trimLines: boolean;
    collapseSpaces: boolean;
    collapseBlankLines: boolean;
    stripHtml: boolean;
    straightQuotes: boolean;
    removeZeroWidth: boolean;
  },
): string {
  let t = text;
  if (opts.removeZeroWidth) t = t.replace(/[​-‍﻿­]/g, '');
  if (opts.stripHtml) t = t.replace(/<[^>]*>/g, '');
  if (opts.straightQuotes) t = t.replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...');
  if (opts.collapseSpaces) t = t.replace(/[ \t ]+/g, ' ');
  if (opts.trimLines) t = splitLines(t).map((l) => l.trim()).join('\n');
  if (opts.collapseBlankLines) t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}
