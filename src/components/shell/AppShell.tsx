'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Bell, LayoutDashboard, LogIn, Pause, Play, Search, Settings, ShieldCheck, User, Wrench, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusic } from '@/components/providers/MusicProvider';
import { TOOLS } from '@/tools/registry';
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

const MARQUEE_TEXT = 'TOOLSPHONE - ALL IN ONE TOOLS -';

function isActive(path: string, href: string): boolean {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

function AccountLink({ viewer, className }: { viewer: ShellViewer; className?: string }) {
  if (viewer.signedIn) {
    return (
      <Link href="/profile" className={cn('inline-flex items-center gap-2', className)} aria-label="Profil">
        <User size={18} strokeWidth={2.6} aria-hidden />
        <span className="max-w-[9rem] truncate">{viewer.name ?? 'Profil'}</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn('inline-flex items-center gap-2', className)}>
      <LogIn size={18} strokeWidth={2.6} aria-hidden />
      <span>Masuk</span>
    </Link>
  );
}

/** Teks berjalan dekoratif di atas header. Dua grup identik → loop mulus (translateX -50%). */
function Marquee() {
  const group = Array.from({ length: 8 }, (_, i) => <span key={i}>{MARQUEE_TEXT}</span>);
  return (
    <div className="nb-marquee" aria-hidden>
      <div className="nb-marquee-track">
        <div className="nb-marquee-group">{group}</div>
        <div className="nb-marquee-group">{group}</div>
      </div>
    </div>
  );
}

/** Tombol musik melayang: hanya tampil bila Live Music aktif di Pengaturan dan ada track. */
function MusicFab() {
  const m = useMusic();
  if (!m.enabled || !m.current) return null;
  const Icon = m.playing ? Pause : Play;
  return (
    <button
      type="button"
      onClick={m.toggle}
      aria-pressed={m.playing}
      aria-label={`${m.playing ? 'Jeda' : 'Putar'} musik: ${m.current.title}`}
      data-playing={m.playing}
      className="nb-fab"
    >
      <span key={String(m.playing)} className="nb-fab-icon">
        <Icon size={24} strokeWidth={2.8} fill="currentColor" aria-hidden />
      </span>
    </button>
  );
}

export function AppShell({ viewer, apkUrl, children }: { viewer: ShellViewer; apkUrl: string; children: ReactNode }) {
  const path = usePathname() ?? '/';

  // Bayangan header menebal saat halaman di-scroll (0 = di atas, 1 = sedikit, 2 = jauh).
  const [scrollLevel, setScrollLevel] = useState(0);
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const y = window.scrollY;
      setScrollLevel(y > 160 ? 2 : y > 6 ? 1 : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const accountHref = viewer.signedIn ? '/profile' : '/login';
  const accountActive = isActive(path, accountHref) || (!viewer.signedIn && isActive(path, '/register'));
  const AccountIcon = viewer.signedIn ? User : LogIn;

  return (
    <div className="min-h-dvh">
      {/* ───────── Sidebar (desktop saja) ───────── */}
      <aside className="nb-side hidden lg:flex">
        <div className="px-1 pb-5 pt-1">
          <Logo />
        </div>
        <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-2.5">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className="nb-navlink">
                <Icon size={20} strokeWidth={2.6} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {viewer.isStaff && (
            <Link
              href="/admin"
              aria-current={isActive(path, '/admin') ? 'page' : undefined}
              className="nb-navlink nb-navlink--admin mt-3"
            >
              <ShieldCheck size={20} strokeWidth={2.6} aria-hidden />
              <span>Admin</span>
            </Link>
          )}
        </nav>
        <div className="nb-account">
          <AccountLink viewer={viewer} className="nb-account-link" />
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* ───────── Marquee di atas header ───────── */}
        <Marquee />

        {/* ───────── Top bar ───────── */}
        <header className="nb-topbar" data-scroll={scrollLevel}>
          <div className="nb-topbar-row mx-auto w-full max-w-[1200px] px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <span className="nb-pill">{TOOLS.length} TOOLS</span>
            <form action="/tools" method="get" role="search" className="nb-search">
              <label htmlFor="shell-search" className="sr-only">
                Cari tool
              </label>
              <button type="submit" className="nb-search-btn" aria-label="Cari">
                <Search size={18} strokeWidth={2.8} aria-hidden />
              </button>
              <input
                id="shell-search"
                name="q"
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Cari tool…"
                maxLength={80}
                className="input nb-search-input"
              />
            </form>
          </div>
        </header>

        {/* ───────── Konten (maks 1200px) ───────── */}
        <main id="main">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-36 pt-6 sm:px-6 lg:pb-14 lg:pt-8">
            {children}
            <Footer apkUrl={apkUrl} />
          </div>
        </main>
      </div>

      {/* ───────── Bottom navigation (mobile / tablet saja) ───────── */}
      <nav aria-label="Navigasi utama" className="nb-bottom safe-bottom lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1.5">
          {NAV.map((item) => {
            const active = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className="nb-tab">
                  <Icon size={22} strokeWidth={2.6} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href={accountHref} aria-current={accountActive ? 'page' : undefined} className="nb-tab">
              <AccountIcon size={22} strokeWidth={2.6} aria-hidden />
              <span>{viewer.signedIn ? 'Profil' : 'Masuk'}</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* ───────── Tombol musik melayang ───────── */}
      <MusicFab />
    </div>
  );
}
