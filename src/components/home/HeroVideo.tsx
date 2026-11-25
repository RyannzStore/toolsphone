'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/components/providers/PrefsProvider';

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

/**
 * Video ambience hero. Dimuat setelah halaman idle (tidak menghambat render awal) dan
 * dimatikan otomatis untuk "kurangi animasi", mode hemat data, atau bila file tidak ada.
 */
export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { prefs, ready } = usePrefs();
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || !ready) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean((navigator as NavigatorWithConnection).connection?.saveData);
    const allowed =
      prefs.heroVideo && !saveData && (prefs.motion === 'full' || (prefs.motion === 'system' && !reduce));

    if (!allowed) {
      v.pause();
      v.removeAttribute('src');
      v.load();
      setVisible(false);
      return;
    }

    const start = () => {
      if (!v.getAttribute('src')) v.src = src;
      v.play().catch(() => undefined);
    };

    let cancel: () => void;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(start, 400);
      cancel = () => window.clearTimeout(id);
    }
    return cancel;
  }, [ready, prefs.heroVideo, prefs.motion, src]);

  if (failed) return null;

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setFailed(true)}
      onPlaying={() => setVisible(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
        visible ? 'opacity-[0.38]' : 'opacity-0'
      }`}
    />
  );
}
