'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bell, LayoutDashboard, LogIn, Settings, ShieldCheck, User, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from './Footer';
import { Logo } from './Logo';

export interface ShellViewer {
  signedIn: boolean;
  name: string | null;
  isStaff: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

function isActive(path: string, href: string): boolean {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

function AccountLink({ viewer, className }: { viewer: ShellViewer; className?: string }) {
  if (viewer.signedIn) {
    return (
      <Link href="/profile" className={cn('inline-flex items-center gap-2', className)} aria-label="Profil">
        <User size={18} aria-hidden />
        <span className="max-w-[9rem] truncate">{viewer.name ?? 'Profil'}</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn('inline-flex items-center gap-2', className)}>
      <LogIn size={18} aria-hidden />
      <span>Masuk</span>
    </Link>
  );
}

export function AppShell({ viewer, apkUrl, children }: { viewer: ShellViewer; apkUrl: string; children: ReactNode }) {
  const path = usePathname() ?? '/';

  return (
    <div className="min-h-dvh">
      {/* ───────── Sidebar (desktop) ───────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-[#090b0e]/90 p-4 backdrop-blur-xl lg:flex">
        <div className="px-2 pb-5 pt-2">
          <Logo />
        </div>
        <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex min-h-[46px] items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold transition',
                  active
                    ? 'border-accent/35 bg-accent/10 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-100',
                )}
              >
                {active && <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r bg-accent" aria-hidden />}
                <Icon size={19} className={active ? 'text-accent' : ''} aria-hidden />
                {item.label}
              </Link>
            );
          })}
          {viewer.isStaff && (
            <Link
              href="/admin"
              aria-current={isActive(path, '/admin') ? 'page' : undefined}
              className={cn(
                'mt-3 flex min-h-[46px] items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold transition',
                isActive(path, '/admin')
                  ? 'border-gold/40 bg-gold/10 text-zinc-50'
                  : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-100',
              )}
            >
              <ShieldCheck size={19} className="text-gold" aria-hidden /> Admin
            </Link>
          )}
        </nav>
        <div className="panel p-2">
          <AccountLink
            viewer={viewer}
            className="min-h-[44px] w-full rounded-lg px-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.05]"
          />
        </div>
      </aside>

      {/* ───────── Top bar (mobile / tablet) ───────── */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between rounded-none border-x-0 border-t-0 px-4 lg:hidden">
        <Logo compact />
        <AccountLink
          viewer={viewer}
          className="min-h-[44px] rounded-lg px-2 text-sm font-semibold text-zinc-300 transition hover:text-zinc-50"
        />
      </header>

      {/* ───────── Konten ───────── */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
          <Footer apkUrl={apkUrl} />
        </div>
      </main>

      {/* ───────── Bottom navigation (mobile / tablet) ───────── */}
      <nav
        aria-label="Navigasi utama"
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95',
                    active ? 'text-accent' : 'text-zinc-500 hover:text-zinc-200',
                  )}
                >
                  {active && <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-accent" aria-hidden />}
                  <Icon size={22} strokeWidth={active ? 2.3 : 1.9} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
