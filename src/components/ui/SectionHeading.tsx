import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function SectionHeading({
  title,
  subtitle,
  href,
  hrefLabel = 'Lihat semua',
  id,
  right,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  id?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg font-semibold text-zinc-50">
          {title}
        </h2>
        {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      {right}
      {href ? (
        <Link href={href} className="inline-flex min-h-[44px] flex-none items-center gap-0.5 text-sm font-semibold text-accent transition hover:brightness-125">
          {hrefLabel} <ChevronRight size={16} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
