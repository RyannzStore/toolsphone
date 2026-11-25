import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { getSiteSettings, getToolSettings } from '@/lib/data';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getTool, resolveAll } from '@/tools/registry';
import { ToolCard } from '@/components/tools/ToolCard';
import { PremiumBadge } from '@/components/ui/Badges';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ClearHistoryButton } from '@/components/account/RowActions';
import { contactLinks } from '@/config/site';
import { formatDate, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'Profil' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) redirect('/login?next=/profile');

  const supabase = await getSupabaseServer();
  const [overrides, site] = await Promise.all([getToolSettings(), getSiteSettings()]);
  const resolved = new Map(resolveAll(overrides).map((t) => [t.slug, t]));

  let favSlugs: string[] = [];
  let history: { slug: string; created_at: string }[] = [];
  if (supabase) {
    const [fav, his] = await Promise.all([
      supabase.from('favorites').select('slug').order('created_at', { ascending: false }).limit(60),
      supabase.from('history').select('slug, created_at').order('created_at', { ascending: false }).limit(30),
    ]);
    favSlugs = (fav.data ?? []).map((r: { slug: string }) => r.slug);
    history = (his.data ?? []) as typeof history;
  }
  const favorites = favSlugs.map((s) => resolved.get(s)).filter((t): t is NonNullable<typeof t> => !!t);
  const contacts = contactLinks(site);
  const premiumActive = viewer.hasPremium;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="panel panel-pad flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-zinc-50">{viewer.displayName}</h1>
          <p className="truncate text-sm text-zinc-500">{viewer.email}</p>
          <p className="mt-1 text-xs capitalize text-zinc-500">Role: {viewer.role}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {premiumActive ? <PremiumBadge /> : <span className="badge badge-free">Free</span>}
          <Link href="/settings#account" className="btn btn-sm">Kelola akun</Link>
          {viewer.isStaff ? <Link href="/admin" className="btn btn-sm">Admin</Link> : null}
        </div>
      </header>

      <section id="premium" aria-labelledby="premium-h" className="panel panel-pad scroll-mt-20 space-y-2">
        <h2 id="premium-h" className="text-lg font-semibold text-zinc-50">Premium</h2>
        {premiumActive ? (
          <p className="text-sm text-zinc-300">
            {viewer.isStaff && !viewer.premiumUntil
              ? 'Akun staff otomatis memiliki akses semua tool.'
              : viewer.premiumUntil
                ? `Premium aktif sampai ${formatDate(viewer.premiumUntil)}.`
                : 'Premium aktif.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Premium membuka tool lanjutan (ditandai badge Premium di daftar tools). Aktivasi dilakukan manual oleh admin
              {viewer.premiumUntil ? ` — premium sebelumnya berakhir ${formatDate(viewer.premiumUntil)}.` : '.'}
            </p>
            {contacts.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {contacts.map((c) => (
                  <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Hubungi via {c.label}</a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Kontak admin akan ditampilkan di sini setelah dikonfigurasi.</p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="fav-h">
        <SectionHeading id="fav-h" title="Favorites" subtitle={`${favorites.length} tool`} />
        {favorites.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((t, i) => <ToolCard key={t.slug} tool={t} delay={i * 30} />)}
          </div>
        ) : (
          <p className="panel panel-pad text-sm text-zinc-500">Belum ada favorit. Tekan ikon hati di halaman tool untuk menyimpannya.</p>
        )}
      </section>

      <section aria-labelledby="his-h">
        <SectionHeading id="his-h" title="History" subtitle="30 pemakaian terakhir" right={history.length ? <ClearHistoryButton userId={viewer.userId} /> : null} />
        {history.length ? (
          <ul className="panel divide-y divide-white/[0.06] overflow-hidden">
            {history.map((h, i) => {
              const meta = getTool(h.slug);
              return (
                <li key={`${h.slug}-${h.created_at}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  {meta ? <Link href={`/tools/${meta.slug}`} className="min-w-0 truncate font-semibold text-zinc-100 hover:text-accent">{meta.name}</Link> : <span className="truncate text-zinc-500">{h.slug}</span>}
                  <span className="flex-none text-xs text-zinc-500">{timeAgo(h.created_at)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="panel panel-pad text-sm text-zinc-500">Belum ada riwayat. Tool yang kamu buka saat login akan tercatat di sini.</p>
        )}
      </section>
    </div>
  );
}
