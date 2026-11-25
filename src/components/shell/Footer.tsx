import Link from 'next/link';
import { Download } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { LogoMark } from './Logo';

export function Footer({ apkUrl }: { apkUrl: string }) {
  const links = [
    { href: '/tools', label: 'Tools' },
    { href: '/about', label: 'About' },
    { href: '/about#contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ];
  return (
    <footer className="mt-12 border-t border-white/[0.06] pt-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <LogoMark size={36} />
          <div>
            <p className="font-heading text-base font-bold text-zinc-50">ToolsPhone</p>
            <p className="text-sm text-zinc-500">{siteConfig.tagline}</p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="inline-flex min-h-[44px] items-center text-sm text-zinc-400 transition hover:text-zinc-100">
              {l.label}
            </Link>
          ))}
          {apkUrl ? (
            <a
              href={apkUrl}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
              rel="noopener"
            >
              <Download size={14} aria-hidden /> Download APK
            </a>
          ) : (
            <Link
              href="/settings#android"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              <Download size={14} aria-hidden /> Download APK <span className="badge badge-muted">Soon</span>
            </Link>
          )}
        </nav>
      </div>
      <p className="mt-6 pb-2 text-xs text-zinc-600">© 2026 ToolsPhone. All rights reserved.</p>
    </footer>
  );
}
