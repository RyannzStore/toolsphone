import type { Metadata } from 'next';
import { getSiteSettings, getTeam } from '@/lib/data';
import { contactLinks, siteConfig } from '@/config/site';
import { LogoMark } from '@/components/shell/Logo';

export const metadata: Metadata = { title: 'About', description: siteConfig.description };
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const [team, site] = await Promise.all([getTeam(), getSiteSettings()]);
  const contacts = contactLinks(site);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center gap-4">
        <LogoMark size={52} />
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">ToolsPhone</h1>
          <p className="text-sm text-zinc-400">{siteConfig.tagline}</p>
        </div>
      </header>

      <section className="panel panel-pad space-y-2">
        <p className="text-zinc-300">{siteConfig.description}</p>
        <dl className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-black/25 text-sm">
          {[
            ['Version', siteConfig.version],
            ['Creator', siteConfig.creator],
            ['Website', siteConfig.domainLabel],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-2.5">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="font-mono text-zinc-100">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="team-h" className="panel panel-pad">
        <h2 id="team-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Team Produksi</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {team.map((m) => (
            <li key={m.id} className="inset flex items-center gap-3 px-3 py-2.5">
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className="h-10 w-10 flex-none rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent/15 font-heading font-semibold text-accent" aria-hidden>
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-100">
                  {m.name} {m.emoji ? <span aria-hidden>{m.emoji}</span> : null}
                </p>
                <p className="text-xs text-zinc-500">{m.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="contact" aria-labelledby="contact-h" className="panel panel-pad scroll-mt-20">
        <h2 id="contact-h" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Contact</h2>
        {contacts.length ? (
          <div className="flex flex-wrap gap-2">
            {contacts.map((c) => (
              <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" className="btn">
                {c.label}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Kontak WhatsApp dan TikTok akan tersedia setelah dikonfigurasi oleh admin.</p>
        )}
      </section>
    </div>
  );
}
