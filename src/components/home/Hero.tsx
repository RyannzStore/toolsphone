import type { TeamMember } from '@/config/site';
import { siteConfig } from '@/config/site';
import { initials } from '@/lib/utils';
import { HeroVideo } from './HeroVideo';
import { LiveDate } from './LiveDate';

function Avatar({ member }: { member: TeamMember }) {
  if (member.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={member.avatar_url}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="h-10 w-10 flex-none rounded-full border border-white/15 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-accent/40 font-heading text-sm font-bold text-zinc-50"
      style={{ background: 'linear-gradient(160deg, rgb(var(--accent) / 0.35), rgba(255,255,255,0.04))' }}
    >
      {initials(member.name)}
    </span>
  );
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <li className="glass flex min-w-[148px] items-center gap-3 rounded-2xl px-3 py-2.5 shadow-[0_0_0_1px_rgb(var(--accent)/0.04)]">
      <Avatar member={member} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-50">{member.name}</p>
        <p className="truncate text-xs text-zinc-400">
          {member.role}
          {member.emoji ? <span aria-hidden> {member.emoji}</span> : null}
        </p>
      </div>
    </li>
  );
}

export function Hero({ name, team }: { name: string | null; team: TeamMember[] }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="hud panel relative isolate overflow-hidden rounded-3xl"
      style={{ background: 'linear-gradient(180deg,#0c0f13,#080a0d)' }}
    >
      {/* Video ambience (hanya area ini, bukan seluruh website) */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 320px at 85% 0%, rgb(var(--accent) / 0.16), transparent 60%), radial-gradient(600px 300px at 0% 100%, rgba(255,255,255,0.05), transparent 60%)',
          }}
        />
        <HeroVideo src={siteConfig.heroVideo} />
        {/* overlay gelap agar teks selalu terbaca */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#080a0d]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/20" />
      </div>

      <div className="relative z-10 px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9">
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.28em] text-accent">ToolsPhone</p>
        <h1 id="hero-title" className="mt-2 text-[1.75rem] font-bold leading-tight text-zinc-50 sm:text-4xl">
          Halo, {name ?? 'Tamu'} <span aria-hidden>👋</span>
        </h1>
        <LiveDate />

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Team Produksi</h2>
          <ul className="flex flex-wrap gap-2.5">
            {team.map((m) => (
              <TeamCard key={m.id} member={m} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
