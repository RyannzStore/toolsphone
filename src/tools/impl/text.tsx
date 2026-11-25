'use client';

import { useMemo, useState, type ComponentType } from 'react';
import {
  capitalizeText, cleanText, removeDuplicateLines, removeEmptyLines, reverseText, sortLines, wordStats,
} from '@/lib/text';
import { Actions, Card, Output, Row, Segmented, SelectField, Stat, StatGrid, TextAreaField, Toggle } from '@/components/tools/ui';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);

function minutesLabel(m: number): string {
  if (m <= 0) return '0 dtk';
  if (m < 1) return `${Math.max(1, Math.round(m * 60))} dtk`;
  return `${fmt(m)} mnt`;
}

function WordCounter() {
  const [text, setText] = useState('');
  const s = useMemo(() => wordStats(text), [text]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={9} placeholder="Ketik atau tempel teks di sini…" />
      <StatGrid cols={4}>
        <Stat label="Kata" value={s.words} accent />
        <Stat label="Karakter" value={s.characters} />
        <Stat label="Kalimat" value={s.sentences} />
        <Stat label="Paragraf" value={s.paragraphs} />
        <Stat label="Tanpa spasi" value={s.charactersNoSpaces} />
        <Stat label="Baris" value={s.lines} />
        <Stat label="Waktu baca" value={minutesLabel(s.readingMinutes)} sub="± 200 kata/mnt" />
        <Stat label="Waktu bicara" value={minutesLabel(s.speakingMinutes)} sub="± 130 kata/mnt" />
      </StatGrid>
    </Card>
  );
}

function CharacterCounter() {
  const [text, setText] = useState('');
  const [limit, setLimit] = useState('');
  const s = useMemo(() => wordStats(text), [text]);
  const lim = Number(limit);
  const hasLimit = limit.trim() !== '' && Number.isFinite(lim) && lim > 0;
  const remaining = hasLimit ? lim - s.characters : 0;
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={8} placeholder="Ketik atau tempel teks di sini…" />
      <Row>
        <div>
          <label className="label" htmlFor="char-limit">Batas karakter (opsional)</label>
          <input id="char-limit" className="input" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} placeholder="mis. 280" />
        </div>
      </Row>
      <StatGrid cols={4}>
        <Stat label="Karakter" value={s.characters} accent />
        <Stat label="Tanpa spasi" value={s.charactersNoSpaces} />
        <Stat label="Byte (UTF-8)" value={s.bytes} />
        <Stat label="Baris" value={s.lines} />
      </StatGrid>
      {hasLimit ? (
        <p className={remaining < 0 ? 'text-sm font-semibold text-red-300' : 'text-sm text-zinc-300'} role="status">
          {remaining >= 0 ? `Sisa ${remaining} karakter dari ${lim}.` : `Lebih ${-remaining} karakter dari batas ${lim}.`}
        </p>
      ) : null}
    </Card>
  );
}

function RemoveDuplicateLines() {
  const [text, setText] = useState('');
  const [cs, setCs] = useState(false);
  const [trim, setTrim] = useState(true);
  const [keepEmpty, setKeepEmpty] = useState(false);
  const out = useMemo(() => removeDuplicateLines(text, { caseSensitive: cs, trim, keepEmpty }), [text, cs, trim, keepEmpty]);
  const before = text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
  const after = out === '' && text === '' ? 0 : out.split('\n').length;
  return (
    <Card>
      <TextAreaField label="Teks (satu item per baris)" value={text} onChange={setText} rows={8} />
      <div className="grid gap-1 sm:grid-cols-3">
        <Toggle label="Bedakan huruf besar/kecil" checked={cs} onChange={setCs} />
        <Toggle label="Abaikan spasi tepi" checked={trim} onChange={setTrim} />
        <Toggle label="Pertahankan baris kosong" checked={keepEmpty} onChange={setKeepEmpty} />
      </div>
      <p className="text-xs text-zinc-500">{before} baris → {after} baris ({Math.max(before - after, 0)} dihapus)</p>
      <Output label="Hasil" value={out} rows={8} mono={false} />
    </Card>
  );
}

function RemoveEmptyLines() {
  const [text, setText] = useState('');
  const [ws, setWs] = useState(true);
  const [collapse, setCollapse] = useState(false);
  const out = useMemo(() => removeEmptyLines(text, { treatWhitespaceAsEmpty: ws, collapseOnly: collapse }), [text, ws, collapse]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={8} />
      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle label="Baris berisi spasi dianggap kosong" checked={ws} onChange={setWs} />
        <Toggle label="Sisakan satu baris kosong saja" hint="Hanya gabungkan baris kosong berurutan" checked={collapse} onChange={setCollapse} />
      </div>
      <Output label="Hasil" value={out} rows={8} mono={false} />
    </Card>
  );
}

function CaseConverter({ mode }: { mode: 'upper' | 'lower' }) {
  const [text, setText] = useState('');
  const out = mode === 'upper' ? text.toUpperCase() : text.toLowerCase();
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={7} />
      <Output label="Hasil" value={out} rows={7} mono={false} />
    </Card>
  );
}
const Uppercase = () => <CaseConverter mode="upper" />;
const Lowercase = () => <CaseConverter mode="lower" />;

function Capitalize() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'words' | 'sentences'>('words');
  const out = useMemo(() => capitalizeText(text, mode), [text, mode]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={7} />
      <Segmented
        label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'words', label: 'Tiap Kata' },
          { value: 'sentences', label: 'Awal Kalimat' },
        ]}
      />
      <Output label="Hasil" value={out} rows={7} mono={false} />
    </Card>
  );
}

function ReverseText() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'characters' | 'words' | 'lines'>('characters');
  const out = useMemo(() => reverseText(text, mode), [text, mode]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={7} />
      <Segmented
        label="Balik per"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'characters', label: 'Karakter' },
          { value: 'words', label: 'Kata' },
          { value: 'lines', label: 'Baris' },
        ]}
      />
      <Output label="Hasil" value={out} rows={7} mono={false} />
    </Card>
  );
}

function SortLines() {
  const [text, setText] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc' | 'length' | 'random'>('asc');
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [natural, setNatural] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [seed, setSeed] = useState(0);
  // `seed` hanya memicu hitung ulang untuk mode acak
  const out = useMemo(() => {
    void seed;
    return sortLines(text, { order, ignoreCase, natural, removeEmpty });
  }, [text, order, ignoreCase, natural, removeEmpty, seed]);
  return (
    <Card>
      <TextAreaField label="Teks (satu item per baris)" value={text} onChange={setText} rows={8} />
      <SelectField
        label="Urutan"
        value={order}
        onChange={(v) => setOrder(v as typeof order)}
        options={[
          { value: 'asc', label: 'A → Z' },
          { value: 'desc', label: 'Z → A' },
          { value: 'length', label: 'Terpendek → terpanjang' },
          { value: 'random', label: 'Acak' },
        ]}
      />
      <div className="grid gap-1 sm:grid-cols-3">
        <Toggle label="Abaikan huruf besar/kecil" checked={ignoreCase} onChange={setIgnoreCase} />
        <Toggle label="Urut angka alami" hint="a2 sebelum a10" checked={natural} onChange={setNatural} />
        <Toggle label="Buang baris kosong" checked={removeEmpty} onChange={setRemoveEmpty} />
      </div>
      {order === 'random' ? (
        <Actions>
          <button type="button" className="btn btn-sm" onClick={() => setSeed((s) => s + 1)}>Acak ulang</button>
        </Actions>
      ) : null}
      <Output label="Hasil" value={out} rows={8} mono={false} />
    </Card>
  );
}

function TextCleaner() {
  const [text, setText] = useState('');
  const [o, setO] = useState({
    trimLines: true,
    collapseSpaces: true,
    collapseBlankLines: true,
    stripHtml: false,
    straightQuotes: false,
    removeZeroWidth: true,
  });
  const set = (k: keyof typeof o) => (v: boolean) => setO((p) => ({ ...p, [k]: v }));
  const out = useMemo(() => cleanText(text, o), [text, o]);
  return (
    <Card>
      <TextAreaField label="Teks" value={text} onChange={setText} rows={8} />
      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle label="Rapikan spasi di tepi baris" checked={o.trimLines} onChange={set('trimLines')} />
        <Toggle label="Gabungkan spasi berulang" checked={o.collapseSpaces} onChange={set('collapseSpaces')} />
        <Toggle label="Gabungkan baris kosong berulang" checked={o.collapseBlankLines} onChange={set('collapseBlankLines')} />
        <Toggle label="Hapus tag HTML" checked={o.stripHtml} onChange={set('stripHtml')} />
        <Toggle label="Ubah tanda kutip pintar jadi biasa" checked={o.straightQuotes} onChange={set('straightQuotes')} />
        <Toggle label="Hapus karakter tak terlihat" hint="zero-width, soft hyphen" checked={o.removeZeroWidth} onChange={set('removeZeroWidth')} />
      </div>
      <Output label="Hasil" value={out} rows={8} mono={false} />
    </Card>
  );
}

const tools: Record<string, ComponentType> = {
  'word-counter': WordCounter,
  'character-counter': CharacterCounter,
  'remove-duplicate-lines': RemoveDuplicateLines,
  'remove-empty-lines': RemoveEmptyLines,
  uppercase: Uppercase,
  lowercase: Lowercase,
  capitalize: Capitalize,
  'reverse-text': ReverseText,
  'sort-lines': SortLines,
  'text-cleaner': TextCleaner,
};

export default tools;
