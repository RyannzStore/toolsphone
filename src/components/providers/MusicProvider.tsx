'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MusicTrack } from '@/config/site';
import { usePrefs } from './PrefsProvider';

export interface MusicContextValue {
  tracks: MusicTrack[];
  current: MusicTrack | null;
  index: number;
  playing: boolean;
  loading: boolean;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
  enabled: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  select: (id: string) => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ tracks, children }: { tracks: MusicTrack[]; children: ReactNode }) {
  const { prefs, setPref } = usePrefs();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Niat pemutaran: dipakai agar pergantian track tetap lanjut memutar. */
  const wantPlay = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const index = useMemo(() => {
    const i = tracks.findIndex((t) => t.id === prefs.trackId);
    return i < 0 ? 0 : i;
  }, [tracks, prefs.trackId]);
  const current: MusicTrack | null = tracks[index] ?? null;
  const currentSrc = current?.src ?? null;

  // Ganti sumber audio saat track berubah (file baru baru diunduh saat Play — preload="none").
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!currentSrc) {
      a.removeAttribute('src');
      a.load();
      return;
    }
    a.src = currentSrc;
    setError(null);
    setTime(0);
    setDuration(0);
    if (wantPlay.current) {
      setLoading(true);
      a.play().catch(() => {
        /* error ditangani event onError / catch di play() */
      });
    }
  }, [currentSrc]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = prefs.volume;
  }, [prefs.volume]);

  useEffect(() => {
    if (!prefs.musicEnabled) {
      wantPlay.current = false;
      audioRef.current?.pause();
      setLoading(false);
    }
  }, [prefs.musicEnabled]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current || !prefs.musicEnabled) return;
    wantPlay.current = true;
    setError(null);
    setLoading(true);
    a.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setLoading(false);
      setPlaying(false);
      wantPlay.current = false;
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setError('Browser memblokir pemutaran — tekan Play sekali lagi.');
      } else {
        setError('Musik tidak bisa diputar. Pastikan file ada di public/music/ atau URL-nya benar.');
      }
    });
  }, [current, prefs.musicEnabled]);

  const pause = useCallback(() => {
    wantPlay.current = false;
    audioRef.current?.pause();
    setLoading(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing || loading) pause();
    else play();
  }, [playing, loading, pause, play]);

  const step = useCallback(
    (dir: 1 | -1, force = false) => {
      if (!tracks.length) return;
      wantPlay.current = force || playing || loading;
      if (tracks.length === 1) {
        const a = audioRef.current;
        if (a) a.currentTime = 0;
        return;
      }
      const nextIndex = (index + dir + tracks.length) % tracks.length;
      setPref('trackId', tracks[nextIndex].id);
    },
    [tracks, index, playing, loading, setPref],
  );
  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    // Kebiasaan player: >3 detik berjalan → ulang dari awal dulu
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    step(-1);
  }, [step]);

  const select = useCallback(
    (id: string) => {
      if (!prefs.musicEnabled) return;
      wantPlay.current = true;
      if (current && id === current.id) {
        play();
        return;
      }
      setPref('trackId', id);
    },
    [prefs.musicEnabled, current, play, setPref],
  );

  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(seconds)) return;
    a.currentTime = Math.max(0, seconds);
    setTime(a.currentTime);
  }, []);

  const setVolume = useCallback((v: number) => setPref('volume', Math.min(1, Math.max(0, v))), [setPref]);

  // Media Session (kontrol di notifikasi / lock screen) bila didukung
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !current) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist || 'ToolsPhone Live Music',
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', next);
    } catch {
      /* browser tidak mendukung sebagian action */
    }
  }, [current, playing, play, pause, prev, next]);

  const value = useMemo<MusicContextValue>(
    () => ({
      tracks,
      current,
      index,
      playing,
      loading: loading && !playing,
      error,
      time,
      duration,
      volume: prefs.volume,
      enabled: prefs.musicEnabled,
      play,
      pause,
      toggle,
      next,
      prev,
      select,
      seek,
      setVolume,
    }),
    [tracks, current, index, playing, loading, error, time, duration, prefs.volume, prefs.musicEnabled, play, pause, toggle, next, prev, select, seek, setVolume],
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPlaying={() => setLoading(false)}
        onPause={() => setPlaying(false)}
        onWaiting={() => {
          if (wantPlay.current) setLoading(true);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onEnded={() => {
          if (tracks.length > 1) {
            step(1, true);
          } else {
            const a = audioRef.current;
            if (a) {
              a.currentTime = 0;
              a.play().catch(() => undefined);
            }
          }
        }}
        onError={() => {
          wantPlay.current = false;
          setPlaying(false);
          setLoading(false);
          if (audioRef.current?.getAttribute('src')) {
            setError('File musik belum tersedia. Taruh file di public/music/ atau atur dari /admin → Musik.');
          }
        }}
      />
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic harus dipakai di dalam <MusicProvider>');
  return ctx;
}
