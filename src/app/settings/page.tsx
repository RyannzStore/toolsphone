import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Smartphone } from 'lucide-react';
import { getViewer } from '@/lib/auth';
import { getSiteSettings } from '@/lib/data';
import { AccountActions } from '@/components/account/AccountActions';
import { AppearanceSettings, ApplicationSettings, MusicSettings } from '@/components/settings/SettingsPanel';
import { PremiumBadge } from '@/components/ui/Badges';
import { formatDate } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Pengaturan' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [viewer, site] = await Promise.all([getViewer(), getSiteSettings()]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="mb-1">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Pengaturan</h1>
      </header>

      <section id="account" aria-labelledby="account-h" className="scroll-mt-20 space-y-3">
        <h2 id="account-h" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Account</h2>
        {viewer.signedIn && viewer.userId && viewer.email ? (
          <>
            <div className="panel panel-pad flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-50">{viewer.displayName}</p>
                <p className="text-xs capitalize text-zinc-500">{viewer.role}</p>
              </div>
              {viewer.hasPremium ? (
                <div className="text-right">
                  <PremiumBadge />
                  {viewer.premiumUntil && !viewer.isStaff ? <p className="mt-1 text-xs text-zinc-500">Aktif sampai {formatDate(viewer.premiumUntil)}</p> : null}
                </div>
              ) : (
                <Link href="/profile#premium" className="btn btn-sm">Lihat Premium</Link>
              )}
            </div>
            <AccountActions email={viewer.email} displayName={viewer.displayName ?? ''} userId={viewer.userId} />
          </>
        ) : (
          <div className="panel panel-pad space-y-3">
            <p className="text-sm text-zinc-400">Masuk untuk menyimpan Favorites, History, dan sinkronisasi antar perangkat. Tool dasar tetap bisa dipakai tanpa login.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className="btn btn-primary">Masuk</Link>
              <Link href="/register" className="btn">Daftar</Link>
            </div>
          </div>
        )}
      </section>

      <AppearanceSettings />
      <MusicSettings />
      <ApplicationSettings />

      <section id="android" aria-labelledby="android-h" className="panel panel-pad scroll-mt-20 space-y-3">
        <h2 id="android-h" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <Smartphone size={15} aria-hidden /> Aplikasi Android
        </h2>
        <p className="text-sm text-zinc-400">Versi Android membuka tool yang butuh akses native: sensor, info CPU, SIM, aplikasi terpasang, dan lainnya.</p>
        <p className="text-sm text-zinc-300">Latest version: <span className="font-mono">{site.apk_version || siteConfig.apk.version}</span></p>
        {site.apk_url ? (
          <a href={site.apk_url} rel="noopener" className="btn btn-primary">
            <Download size={16} aria-hidden /> Download APK
          </a>
        ) : (
          <button type="button" className="btn" disabled aria-disabled="true">
            Coming Soon
          </button>
        )}
      </section>

      <nav aria-label="Informasi" className="flex flex-wrap gap-x-5 text-sm text-zinc-400">
        <Link href="/about" className="inline-flex min-h-[44px] items-center hover:text-zinc-100">About</Link>
        <Link href="/privacy" className="inline-flex min-h-[44px] items-center hover:text-zinc-100">Privacy</Link>
        <Link href="/terms" className="inline-flex min-h-[44px] items-center hover:text-zinc-100">Terms</Link>
      </nav>
    </div>
  );
}
