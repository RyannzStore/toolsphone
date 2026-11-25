'use client';

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, Info, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

// ───────────────────────────── helpers

/** Parse angka dari input (menerima koma desimal). Mengembalikan null bila kosong/tidak valid. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n: number, maxDigits = 2): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxDigits }).format(n);
}

export function fmtRp(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

/** State yang disimpan di localStorage (aman bila storage tidak tersedia). */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tp:' + key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* abaikan */
    }
    setReady(true);
  }, [key]);
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem('tp:' + key, JSON.stringify(next));
        } catch {
          /* abaikan */
        }
        return next;
      });
    },
    [key],
  );
  return [value, set, ready];
}

// ───────────────────────────── form

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div id={id}>{children}</div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'url' | 'email';
  className?: string;
  suffix?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoFocus?: boolean;
  mono?: boolean;
}

export function TextField({ label, value, onChange, placeholder, hint, type = 'text', inputMode, className, suffix, min, max, step, autoFocus, mono }: InputProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          min={min}
          max={max}
          step={step}
          autoFocus={autoFocus}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn('input', suffix && '!pr-14', mono && 'font-mono text-[15px]')}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function NumField(props: Omit<InputProps, 'type' | 'inputMode'>) {
  return <TextField {...props} type="text" inputMode="decimal" />;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  hint,
  mono,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  mono?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={cn('input', mono && 'font-mono text-[14px]')}
      />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900">
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-1 text-left"
    >
      <span>
        <span className="block text-sm text-zinc-200">{label}</span>
        {hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
      </span>
      <span className="switch" aria-hidden="true" data-on={checked ? 'true' : 'false'} />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div>
      {label ? <span className="label">{label}</span> : null}
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-white/10 bg-black/30 p-1" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-[40px] rounded-lg px-3.5 text-sm font-semibold transition',
              value === o.value ? 'bg-accent text-[rgb(var(--on-accent))] shadow-[0_2px_10px_-4px_rgb(var(--accent))]' : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── output

export function CopyButton({ text, label = 'Salin', className, disabled }: { text: string; label?: string; className?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={cn('btn btn-sm', className)}
      disabled={disabled || !text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
          } catch {
            /* abaikan */
          }
          ta.remove();
        }
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
      {done ? 'Tersalin' : label}
    </button>
  );
}

export function DownloadButton({ onClick, label = 'Unduh', disabled, primary }: { onClick: () => void; label?: string; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" className={cn('btn btn-sm', primary && 'btn-primary')} disabled={disabled} onClick={onClick}>
      <Download size={15} aria-hidden /> {label}
    </button>
  );
}

export function Output({
  label,
  value,
  rows = 6,
  mono = true,
  actions,
}: {
  label: string;
  value: string;
  rows?: number;
  mono?: boolean;
  actions?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="label !mb-0">
          {label}
        </label>
        <div className="flex gap-2">
          {actions}
          <CopyButton text={value} />
        </div>
      </div>
      <textarea id={id} readOnly value={value} rows={rows} className={cn('input', mono && 'font-mono text-[14px]')} onFocus={(e) => e.currentTarget.select()} />
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="inset px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={cn('mt-0.5 break-words font-heading text-lg font-semibold', accent ? 'text-accent' : 'text-zinc-50')}>{value}</p>
      {sub ? <p className="text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

export function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 4 ? 'sm:grid-cols-4' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return <div className={cn('grid grid-cols-2 gap-2.5', c)}>{children}</div>;
}

/** Baris "label : nilai" yang bisa disalin. */
export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-black/25">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:w-44 sm:flex-none">{k}</dt>
          <dd className="min-w-0 break-words font-mono text-sm text-zinc-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const map = {
    info: { cls: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-100/90', Icon: Info },
    error: { cls: 'border-red-400/25 bg-red-400/[0.07] text-red-100', Icon: AlertTriangle },
    warn: { cls: 'border-amber-400/25 bg-amber-400/[0.06] text-amber-100/90', Icon: AlertTriangle },
    success: { cls: 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100/90', Icon: CheckCircle2 },
  }[kind];
  const Icon = map.Icon;
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm', map.cls)}>
      <Icon size={16} className="mt-0.5 flex-none" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('panel panel-pad space-y-4', className)}>
      {title ? <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h3> : null}
      {children}
    </div>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2', className)}>{children}</div>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

// ───────────────────────────── file input

export function FileDrop({
  accept,
  multiple,
  onFiles,
  label = 'Pilih file atau seret ke sini',
  hint,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
}) {
  const [over, setOver] = useState(false);
  const inputId = useId();
  const take = (list: FileList | null) => {
    if (!list || !list.length) return;
    onFiles(Array.from(list));
  };
  return (
    <label
      htmlFor={inputId}
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        'flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition',
        over ? 'border-accent bg-accent/10' : 'border-white/15 bg-black/20 hover:border-white/30',
      )}
    >
      <UploadCloud size={26} className="text-accent" aria-hidden />
      <span className="text-sm font-semibold text-zinc-200">{label}</span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );
}
