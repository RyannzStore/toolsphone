'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function FavoriteButton({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!signedIn) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let alive = true;
    supabase
      .from('favorites')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setFav(Boolean(data));
      });
    return () => {
      alive = false;
    };
  }, [slug, signedIn]);

  if (!signedIn) {
    return (
      <Link href={`/login?next=/tools/${slug}`} className="btn btn-sm" title="Masuk untuk menyimpan favorit">
        <Star size={15} aria-hidden /> Favorit
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        className={cn('btn btn-sm', fav && '!border-gold/50 !text-gold')}
        aria-pressed={fav}
        disabled={busy}
        onClick={async () => {
          const supabase = getSupabaseBrowser();
          if (!supabase) return;
          setBusy(true);
          setErr('');
          const { error } = fav
            ? await supabase.from('favorites').delete().eq('slug', slug)
            : await supabase.from('favorites').insert({ slug });
          setBusy(false);
          if (error) setErr('Gagal menyimpan favorit.');
          else setFav(!fav);
        }}
      >
        <Star size={15} fill={fav ? 'currentColor' : 'none'} aria-hidden /> {fav ? 'Favorit' : 'Tambah favorit'}
      </button>
      {err ? <span className="mt-1 text-xs text-red-300">{err}</span> : null}
    </div>
  );
}
