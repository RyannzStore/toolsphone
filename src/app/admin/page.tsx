import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSiteSettings, getToolSettings } from '@/lib/data';
import { TOOLS, resolveTool } from '@/tools/registry';
import { AdminPanel, type AdminData } from '@/components/admin/AdminPanel';
import type { Announcement, TeamRow, TrackRow } from '@/types/db';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Gerbang server-side. Otorisasi sebenarnya tetap dipaksa database (RLS + fungsi admin_*).
  const viewer = await getViewer();
  if (!viewer.signedIn) redirect('/login?next=/admin');
  if (!viewer.isStaff) notFound();

  const supabase = await getSupabaseServer();
  if (!supabase) notFound();

  const [overrides, site, stats, usage, team, tracks, ann] = await Promise.all([
    getToolSettings(),
    getSiteSettings(),
    supabase.rpc('admin_stats'),
    supabase.rpc('admin_usage', { p_days: 30 }),
    supabase.from('team_members').select('id, name, role, emoji, avatar_url, sort_order').order('sort_order').order('name'),
    supabase.from('music_tracks').select('id, title, artist, src, sort_order, is_active').order('sort_order'),
    supabase.from('announcements').select('id, title, body, kind, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  const data: AdminData = {
    isOwner: viewer.isOwner,
    selfId: viewer.userId ?? '',
    stats: (stats.data as AdminData['stats']) ?? null,
    usage: (usage.data as AdminData['usage']) ?? [],
    tools: TOOLS.filter((t) => !t.native).map((m) => {
      const r = resolveTool(m, overrides[m.slug]);
      return { slug: r.slug, name: r.name, category: r.category, isPremium: r.isPremium, isEnabled: r.isEnabled };
    }),
    team: (team.data as TeamRow[]) ?? [],
    tracks: (tracks.data as TrackRow[]) ?? [],
    announcements: (ann.data as Announcement[]) ?? [],
    settings: site,
  };

  return <AdminPanel data={data} />;
}
