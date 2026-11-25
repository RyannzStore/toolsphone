import Link from 'next/link';
import { Search } from 'lucide-react';
import { getViewer } from '@/lib/auth';
import { getTeam, getToolSettings } from '@/lib/data';
import { CATEGORIES, TOOLS, resolveAll } from '@/tools/registry';
import { getIcon } from '@/tools/icons';
import { Hero } from '@/components/home/Hero';
import { LiveMusic } from '@/components/home/LiveMusic';
import { ToolCard } from '@/components/tools/ToolCard';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default async function DashboardPage() {
  const [viewer, team, overrides] = await Promise.all([getViewer(), getTeam(), getToolSettings()]);
  const enabled = resolveAll(overrides);
  const popular = enabled.filter((t) => t.popular);
  const counts = new Map<string, number>();
  for (const t of enabled) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <Hero name={viewer.displayName} team={team} />

      <section aria-labelledby="music-title">
        <SectionHeading id="music-title" title="Live Music" subtitle="Temani aktivitasmu dengan musik" />
        <LiveMusic />
      </section>

      <section aria-labelledby="popular-title">
        <SectionHeading id="popular-title" title="Fitur Populer" href="/tools" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {popular.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} delay={i * 40} />
          ))}
        </div>
      </section>

      <section aria-labelledby="explore-title">
        <SectionHeading
          id="explore-title"
          title="Jelajahi Tools"
          subtitle={`${enabled.length} tools dalam ${CATEGORIES.length} kategori`}
        />
        <div className="panel panel-pad space-y-4">
          <form action="/tools" method="get" role="search" className="relative">
            <label htmlFor="home-search" className="sr-only">
              Cari tool
            </label>
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              id="home-search"
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Cari tool… (mis. QR, subnet, kompres)"
              className="input !pl-10"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = getIcon(c.icon);
              return (
                <Link key={c.id} href={`/tools?cat=${c.id}`} className="chip">
                  <Icon size={14} aria-hidden /> {c.label}
                  <span className="text-zinc-500">{counts.get(c.id) ?? 0}</span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            {TOOLS.length > 0 ? 'Sebagian besar tool berjalan langsung di perangkatmu — file tidak diunggah ke server.' : ''}
          </p>
        </div>
      </section>
    </div>
  );
}
