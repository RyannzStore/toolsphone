'use client';

import type { ReactNode } from 'react';

import { useMusic } from '@/components/providers/MusicProvider';
import { usePrefs, type Accent, type Motion } from '@/components/providers/PrefsProvider';
import { Segmented, Toggle } from '@/components/tools/ui';
import { siteConfig } from '@/config/site';

const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: 'red', label: 'Merah', color: '#ff3b3b' },
  { value: 'cyan', label: 'Cyan', color: '#22d3ee' },
  { value: 'green', label: 'Hijau', color: '#34d399' },
  { value: 'gold', label: 'Emas', color: '#fbbf24' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} id={id} className="panel panel-pad scroll-mt-20 space-y-4">
      <h2 id={`${id}-h`} className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AppearanceSettings() {
  const { prefs, setPref } = usePrefs();
  return (
    <Section id="appearance" title="Appearance">
      <div>
        <span className="label">Warna aksen</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Warna aksen">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-pressed={prefs.accent === a.value}
              onClick={() => setPref('accent', a.value)}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
                prefs.accent === a.value ? 'border-accent/60 bg-accent/10 text-zinc-50' : 'border-white/10 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: a.color }} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <Segmented<Motion>
        label="Animasi"
        value={prefs.motion}
        onChange={(v) => setPref('motion', v)}
        options={[
          { value: 'system', label: 'Ikuti sistem' },
          { value: 'full', label: 'Penuh' },
          { value: 'reduced', label: 'Dikurangi' },
        ]}
      />
      <Toggle label="Tampilan ringkas" hint="Jarak antar elemen lebih rapat." checked={prefs.compact} onChange={(v) => setPref('compact', v)} />
      <Toggle label="Video Hero di Dashboard" hint="Matikan untuk menghemat data dan baterai." checked={prefs.heroVideo} onChange={(v) => setPref('heroVideo', v)} />
    </Section>
  );
}

export function MusicSettings() {
  const { prefs, setPref } = usePrefs();
  const music = useMusic();
  return (
    <Section id="live-music" title="Live Music">
      <Toggle label="Aktifkan Live Music" hint="Musik tidak pernah diputar otomatis — kamu menekan play sendiri." checked={prefs.musicEnabled} onChange={(v) => setPref('musicEnabled', v)} />
      {prefs.musicEnabled ? (
        <>
          <div>
            <span className="label">Track</span>
            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Pilih track">
              {music.tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={music.current?.id === t.id}
                  onClick={() => music.select(t.id)}
                  className={`min-h-[44px] rounded-xl border px-3 text-left text-sm font-semibold transition ${
                    music.current?.id === t.id ? 'border-accent/60 bg-accent/10 text-zinc-50' : 'border-white/10 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <span className="block truncate">{t.title}</span>
                  {t.artist ? <span className="block truncate text-xs font-normal text-zinc-500">{t.artist}</span> : null}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Volume: {Math.round(music.volume * 100)}%</span>
            <input type="range" className="range w-full" min={0} max={100} value={Math.round(music.volume * 100)} onChange={(e) => music.setVolume(Number(e.target.value) / 100)} />
          </label>
          {music.error ? <p className="text-sm text-amber-300">{music.error}</p> : null}
          <p className="text-xs text-zinc-500">Pilihan track dan volume disimpan di perangkat ini.</p>
        </>
      ) : null}
    </Section>
  );
}

export function ApplicationSettings() {
  const { reset } = usePrefs();
  return (
    <Section id="application" title="Application">
      <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-black/25 text-sm">
        <div className="flex justify-between gap-3 px-3 py-2.5"><dt className="text-zinc-500">Versi web</dt><dd className="font-mono text-zinc-100">{siteConfig.version}</dd></div>
        <div className="flex justify-between gap-3 px-3 py-2.5"><dt className="text-zinc-500">Situs</dt><dd className="font-mono text-zinc-100">{siteConfig.domainLabel}</dd></div>
      </dl>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          if (window.confirm('Kembalikan semua pengaturan tampilan dan musik ke bawaan?')) reset();
        }}
      >
        Reset pengaturan tampilan
      </button>
      <p className="text-xs text-zinc-500">Hanya mengatur preferensi di perangkat ini. Data akun tidak terpengaruh.</p>
    </Section>
  );
}
