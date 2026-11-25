'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

function format(d: Date): string {
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
  const date = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
  return `${weekday}, ${date}`;
}

/** Tanggal otomatis (dirender di client agar sesuai zona waktu pengguna, update saat lewat tengah malam). */
export function LiveDate() {
  const [text, setText] = useState('');

  useEffect(() => {
    const update = () => setText(format(new Date()));
    update();
    const id = window.setInterval(update, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <p className="mt-1 inline-flex min-h-[24px] items-center gap-2 text-sm text-zinc-300/90">
      <CalendarDays size={15} className="text-accent" aria-hidden />
      <time suppressHydrationWarning>{text || ' '}</time>
    </p>
  );
}
