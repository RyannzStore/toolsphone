'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { AlertTriangle, Loader } from 'lucide-react';
import type { CategoryId } from '@/tools/types';

type ImplModule = { default: Record<string, ComponentType> };

// Setiap kategori adalah chunk terpisah → hanya kode kategori yang dibuka yang diunduh.
const LOADERS: Record<CategoryId, () => Promise<ImplModule>> = {
  device: () => import('@/tools/impl/device'),
  'file-media': () => import('@/tools/impl/media'),
  text: () => import('@/tools/impl/text'),
  security: () => import('@/tools/impl/security'),
  developer: () => import('@/tools/impl/developer'),
  network: () => import('@/tools/impl/network'),
  calculator: () => import('@/tools/impl/calculator'),
  school: () => import('@/tools/impl/school'),
  finance: () => import('@/tools/impl/finance'),
  'time-unit': () => import('@/tools/impl/timeunit'),
  generator: () => import('@/tools/impl/generator'),
};

type State = { status: 'loading' } | { status: 'ready'; Comp: ComponentType } | { status: 'missing' } | { status: 'error' };

export function ToolRunner({ category, slug }: { category: CategoryId; slug: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    LOADERS[category]()
      .then((mod) => {
        if (!alive) return;
        const Comp = mod.default[slug];
        setState(Comp ? { status: 'ready', Comp } : { status: 'missing' });
      })
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [category, slug, attempt]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Memuat tool">
        <div className="skeleton h-12" />
        <div className="skeleton h-40" />
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader size={14} className="animate-spin" aria-hidden /> Memuat tool…
        </p>
      </div>
    );
  }
  if (state.status === 'error' || state.status === 'missing') {
    return (
      <div className="panel panel-pad flex flex-col items-start gap-3" role="alert">
        <p className="flex items-center gap-2 font-semibold text-zinc-100">
          <AlertTriangle size={18} className="text-amber-300" aria-hidden />
          {state.status === 'missing' ? 'Tool ini belum tersedia.' : 'Gagal memuat tool.'}
        </p>
        <p className="text-sm text-zinc-400">
          {state.status === 'missing'
            ? 'Implementasi untuk tool ini belum ditambahkan.'
            : 'Periksa koneksi internetmu lalu coba lagi.'}
        </p>
        {state.status === 'error' ? (
          <button type="button" className="btn btn-sm" onClick={() => setAttempt((n) => n + 1)}>
            Coba lagi
          </button>
        ) : null}
      </div>
    );
  }
  const { Comp } = state;
  return (
    <div className="animate-fade-in">
      <Comp />
    </div>
  );
}
