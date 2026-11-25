import Link from 'next/link';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-[10px] border border-white/10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(180deg,#262b32,#0e1115)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12), 0 6px 14px -8px #000',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <rect x="7" y="2.5" width="10" height="19" rx="2.6" stroke="rgb(var(--accent))" strokeWidth="1.8" />
        <path d="M10.5 8h3M12 8v6" stroke="#f4f4f5" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17.6" r="0.9" fill="rgb(var(--accent))" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="ToolsPhone — beranda">
      <LogoMark size={compact ? 30 : 36} />
      <span className="font-heading text-lg font-bold leading-none tracking-wide text-zinc-50">
        Tools<span className="text-accent">Phone</span>
      </span>
    </Link>
  );
}
