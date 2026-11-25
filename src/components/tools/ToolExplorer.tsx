'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchX, Search, X } from 'lucide-react';
import { CATEGORIES, searchTools } from '@/tools/registry';
import { getIcon } from '@/tools/icons';
import type { CategoryId, ResolvedTool } from '@/tools/types';
import { ToolCard } from './ToolCard';
import { cn } from '@/lib/utils';

type Access = 'all' | 'free' | 'premium';

const VALID_CATS = new Set<string>(CATEGORIES.map((c) => c.id));

export function ToolExplorer({ tools }: { tools: ResolvedTool[] }) {
  const params = useSearchParams();
  const initialCat = params.get('cat');
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [cat, setCat] = useState<'all' | CategoryId>(initialCat && VALID_CATS.has(initialCat) ? (initialCat as CategoryId) : 'all');
  const [access, setAccess] = useState<Access>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const syncUrl = useCallback((q: string, c: string) => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (c !== 'all') sp.set('cat', c);
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `/tools?${qs}` : '/tools');
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tools) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return m;
  }, [tools]);

  const filtered = useMemo(() => {
    let list = tools;
    if (cat !== 'all') list = list.filter((t) => t.category === cat);
    if (access === 'free') list = list.filter((t) => !t.isPremium && !t.native);
    if (access === 'premium') list = list.filter((t) => t.isPremium);
    return searchTools(list, query);
  }, [tools, cat, access, query]);

  const grouped = !query.trim() && cat === 'all' && access === 'all';

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <label htmlFor="tool-search" className="sr-only">
          Cari tool
        </label>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          id="tool-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            syncUrl(e.target.value, cat);
          }}
          enterKeyHint="search"
          autoComplete="off"
          placeholder={`Cari di ${tools.length} tools…`}
          className="input !pl-10 !pr-11"
        />
        {query ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              setQuery('');
              syncUrl('', cat);
              inputRef.current?.focus();
            }}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100"
          >
            <X size={18} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Filter kategori */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Filter kategori">
          <button
            type="button"
            className="chip"
            aria-pressed={cat === 'all'}
            onClick={() => {
              setCat('all');
              syncUrl(query, 'all');
            }}
          >
            Semua <span className="text-zinc-500">{tools.length}</span>
          </button>
          {CATEGORIES.map((c) => {
            const Icon = getIcon(c.icon);
            return (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={cat === c.id}
                onClick={() => {
                  setCat(c.id);
                  syncUrl(query, c.id);
                }}
              >
                <Icon size={14} aria-hidden /> {c.label} <span className="text-zinc-500">{counts.get(c.id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter akses */}
      <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-black/30 p-1" role="group" aria-label="Filter akses">
        {(
          [
            ['all', 'Semua'],
            ['free', 'Gratis'],
            ['premium', 'Premium'],
          ] as [Access, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={access === id}
            onClick={() => setAccess(id)}
            className={cn(
              'min-h-[36px] rounded-lg px-3.5 text-xs font-semibold transition',
              access === id ? 'bg-white/10 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Hasil */}
      <div className="mt-6" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
            <SearchX size={32} className="text-zinc-600" aria-hidden />
            <p className="font-semibold text-zinc-200">Tool tidak ditemukan</p>
            <p className="max-w-sm text-sm text-zinc-500">Coba kata kunci lain (mis. “qr”, “json”, “cicilan”) atau ganti filter kategori.</p>
            <button
              type="button"
              className="btn btn-sm mt-2"
              onClick={() => {
                setQuery('');
                setCat('all');
                setAccess('all');
                syncUrl('', 'all');
              }}
            >
              Reset filter
            </button>
          </div>
        ) : grouped ? (
          <div className="space-y-8">
            {CATEGORIES.map((c) => {
              const list = filtered.filter((t) => t.category === c.id);
              if (!list.length) return null;
              const Icon = getIcon(c.icon);
              return (
                <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="icon-tile">
                      <Icon size={18} aria-hidden />
                    </span>
                    <div>
                      <h2 id={`cat-${c.id}`} className="text-base font-semibold text-zinc-50">
                        {c.label}
                      </h2>
                      <p className="text-xs text-zinc-500">{c.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {list.map((t) => (
                      <ToolCard key={t.slug} tool={t} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-zinc-500">{filtered.length} tool ditemukan</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((t) => (
                <ToolCard key={t.slug} tool={t} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
