'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

/** Hapus seluruh riwayat milik user (RLS memastikan hanya baris miliknya yang terhapus). */
export function ClearHistoryButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={busy}
      onClick={async () => {
        const sb = getSupabaseBrowser();
        if (!sb || !window.confirm('Hapus semua riwayat?')) return;
        setBusy(true);
        await sb.from('history').delete().eq('user_id', userId);
        setBusy(false);
        router.refresh();
      }}
    >
      <Trash2 size={14} aria-hidden /> Hapus riwayat
    </button>
  );
}
