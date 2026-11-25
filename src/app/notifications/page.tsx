import type { Metadata } from 'next';
import { Bell, Megaphone, Smartphone, Sparkles, Wrench, AlertTriangle, type LucideIcon } from 'lucide-react';
import { getAnnouncements } from '@/lib/data';
import { formatDateTime } from '@/lib/utils';
import type { AnnouncementKind } from '@/types/db';

export const metadata: Metadata = { title: 'Notifikasi', description: 'Update aplikasi, tool baru, pengumuman, dan info maintenance ToolsPhone.' };
export const dynamic = 'force-dynamic';

const KIND: Record<AnnouncementKind, { label: string; Icon: LucideIcon }> = {
  update: { label: 'Update aplikasi', Icon: Sparkles },
  tool: { label: 'Tool baru', Icon: Wrench },
  announcement: { label: 'Pengumuman', Icon: Megaphone },
  maintenance: { label: 'Maintenance', Icon: AlertTriangle },
  apk: { label: 'APK Android', Icon: Smartphone },
};

export default async function NotificationsPage() {
  const items = await getAnnouncements();
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Notifikasi</h1>
        <p className="mt-1 text-sm text-zinc-400">Info resmi dari tim ToolsPhone.</p>
      </header>
      {items.length === 0 ? (
        <div className="panel panel-pad flex flex-col items-center gap-3 py-12 text-center">
          <Bell size={28} className="text-zinc-600" aria-hidden />
          <p className="font-semibold text-zinc-200">Belum ada notifikasi</p>
          <p className="max-w-sm text-sm text-zinc-500">Pengumuman, update, dan info maintenance akan muncul di sini.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const k = KIND[n.kind] ?? KIND.announcement;
            const Icon = k.Icon;
            return (
              <li key={n.id} className="panel panel-pad flex gap-3">
                <span className="icon-tile flex-none" aria-hidden><Icon size={18} /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{k.label}</p>
                  <h2 className="break-words font-semibold text-zinc-50">{n.title}</h2>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-zinc-400">{n.body}</p>
                  <time dateTime={n.created_at} className="mt-2 block text-xs text-zinc-600">{formatDateTime(n.created_at)}</time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
