'use client';

import { useRef } from 'react';
import { AlertCircle, Disc3, Loader, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMusic } from '@/components/providers/MusicProvider';

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Vinyl({ playing, size = 120 }: { playing: boolean; size?: number }) {
  return (
    <div className="relative flex-none" style={{ width: size, height: size }} aria-hidden>
      <div className={cn('vinyl', playing && 'is-playing')} style={{ ['--size' as string]: `${size}px` }} />
      <span className={cn('tonearm', playing && 'is-playing')} />
    </div>
  );
}

export function LiveMusic() {
  const m = useMusic();
  const lastVolume = useRef(0.7);
  const progress = m.duration > 0 ? Math.min(100, (m.time / m.duration) * 100) : 0;
  const volPct = Math.round(m.volume * 100);

  if (!m.enabled) {
    return (
      <div className="panel panel-pad flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <Disc3 size={18} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Live Music dinonaktifkan</p>
            <p className="text-xs text-zinc-500">Aktifkan lagi di Pengaturan → Live Music.</p>
          </div>
        </div>
        <Link href="/settings#music" className="btn btn-sm">
          Buka Pengaturan
        </Link>
      </div>
    );
  }

  return (
    <div className="panel panel-pad">
      <div className="flex gap-4 sm:gap-6">
        <div className="hidden pt-1 min-[380px]:block">
          <Vinyl playing={m.playing} size={112} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {m.playing ? 'Sedang diputar' : m.loading ? 'Memuat…' : 'Siap diputar'}
              </p>
              <p className="truncate font-heading text-lg font-semibold text-zinc-50" aria-live="polite">
                {m.current?.title ?? 'Tidak ada track'}
              </p>
              {m.current?.artist ? <p className="truncate text-xs text-zinc-400">{m.current.artist}</p> : null}
            </div>
            <span
              className={cn(
                'mt-1 h-2 w-2 flex-none rounded-full',
                m.playing ? 'animate-pulse-soft bg-accent shadow-[0_0_10px_rgb(var(--accent))]' : 'bg-zinc-600',
              )}
              aria-hidden
            />
          </div>

          {/* progress */}
          <div className="mt-3">
            <input
              type="range"
              className="range"
              min={0}
              max={Math.max(m.duration, 1)}
              step={0.1}
              value={Math.min(m.time, Math.max(m.duration, 1))}
              onChange={(e) => m.seek(Number(e.target.value))}
              disabled={!m.duration}
              aria-label="Posisi lagu"
              style={{ ['--p' as string]: `${progress}%` }}
            />
            <div className="-mt-1 flex justify-between font-mono text-[11px] text-zinc-500">
              <span>{fmt(m.time)}</span>
              <span>{m.duration ? fmt(m.duration) : '--:--'}</span>
            </div>
          </div>

          {/* controls */}
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="btn btn-icon" onClick={m.prev} aria-label="Sebelumnya">
              <SkipBack size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="btn btn-primary btn-icon !w-14"
              onClick={m.toggle}
              aria-label={m.playing || m.loading ? 'Jeda' : 'Putar'}
            >
              {m.loading ? (
                <Loader size={20} className="animate-spin" aria-hidden />
              ) : m.playing ? (
                <Pause size={20} fill="currentColor" aria-hidden />
              ) : (
                <Play size={20} fill="currentColor" aria-hidden />
              )}
            </button>
            <button type="button" className="btn btn-icon" onClick={m.next} aria-label="Berikutnya">
              <SkipForward size={18} aria-hidden />
            </button>

            <div className="ml-auto flex min-w-0 max-w-[11rem] flex-1 items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-100"
                aria-label={m.volume === 0 ? 'Suarakan' : 'Bisukan'}
                onClick={() => {
                  if (m.volume > 0) {
                    lastVolume.current = m.volume;
                    m.setVolume(0);
                  } else {
                    m.setVolume(lastVolume.current || 0.7);
                  }
                }}
              >
                {m.volume === 0 ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
              </button>
              <input
                type="range"
                className="range"
                min={0}
                max={1}
                step={0.01}
                value={m.volume}
                onChange={(e) => m.setVolume(Number(e.target.value))}
                aria-label="Volume"
                aria-valuetext={`${volPct}%`}
                style={{ ['--p' as string]: `${volPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {m.error ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200/90" role="status">
          <AlertCircle size={15} className="mt-0.5 flex-none" aria-hidden />
          {m.error}
        </p>
      ) : null}

      {/* track list */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Pilihan musik">
        {m.tracks.map((t, i) => {
          const active = m.current?.id === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => m.select(t.id)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition',
                  active
                    ? 'border-accent/45 bg-accent/10 text-zinc-50'
                    : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/20',
                )}
              >
                <span className="font-mono text-xs text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                {active && m.playing ? <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
