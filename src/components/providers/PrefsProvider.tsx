'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Accent = 'red' | 'cyan' | 'green' | 'gold';
export type Motion = 'system' | 'full' | 'reduced';

export interface Prefs {
  musicEnabled: boolean;
  volume: number; // 0..1
  trackId: string | null;
  motion: Motion;
  accent: Accent;
  compact: boolean;
  heroVideo: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  musicEnabled: true,
  volume: 0.7,
  trackId: null,
  motion: 'system',
  accent: 'red',
  compact: false,
  heroVideo: true,
};

export const STORAGE_KEY = 'tp:prefs:v1';

const ACCENTS: Accent[] = ['red', 'cyan', 'green', 'gold'];
const MOTIONS: Motion[] = ['system', 'full', 'reduced'];

function sanitize(raw: unknown): Prefs {
  const out: Prefs = { ...DEFAULT_PREFS };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.musicEnabled === 'boolean') out.musicEnabled = r.musicEnabled;
  if (typeof r.volume === 'number' && r.volume >= 0 && r.volume <= 1) out.volume = r.volume;
  if (typeof r.trackId === 'string') out.trackId = r.trackId;
  if (typeof r.motion === 'string' && (MOTIONS as string[]).includes(r.motion)) out.motion = r.motion as Motion;
  if (typeof r.accent === 'string' && (ACCENTS as string[]).includes(r.accent)) out.accent = r.accent as Accent;
  if (typeof r.compact === 'boolean') out.compact = r.compact;
  if (typeof r.heroVideo === 'boolean') out.heroVideo = r.heroVideo;
  return out;
}

function applyToDom(p: Prefs) {
  const d = document.documentElement;
  d.dataset.accent = p.accent;
  d.dataset.motion = p.motion;
  if (p.compact) d.dataset.density = 'compact';
  else delete d.dataset.density;
}

interface PrefsContextValue {
  prefs: Prefs;
  /** True setelah preferensi dibaca dari localStorage (hindari flash nilai default). */
  ready: boolean;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  reset: () => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded = DEFAULT_PREFS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) loaded = sanitize(JSON.parse(saved));
    } catch {
      /* localStorage tidak tersedia → pakai default */
    }
    setPrefs(loaded);
    applyToDom(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyToDom(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* abaikan */
    }
  }, [prefs, ready]);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  const value = useMemo(() => ({ prefs, ready, setPref, reset }), [prefs, ready, setPref, reset]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs harus dipakai di dalam <PrefsProvider>');
  return ctx;
}
