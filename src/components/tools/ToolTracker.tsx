'use client';

import { useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/**
 * Mencatat pemakaian tool lewat RPC `record_tool_use`:
 *  - usage agregat per slug/hari (tanpa data pribadi) untuk statistik owner,
 *  - riwayat pribadi bila user login.
 * Gagal diam-diam: tidak boleh mengganggu pemakaian tool.
 */
export function ToolTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const key = `tp:used:${slug}`;
    try {
      // Hindari spam saat refresh: maksimal sekali per 5 menit per tool.
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 5 * 60_000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* sessionStorage tidak tersedia → tetap kirim */
    }
    void supabase.rpc('record_tool_use', { p_slug: slug }).then(
      () => undefined,
      () => undefined,
    );
  }, [slug]);
  return null;
}
