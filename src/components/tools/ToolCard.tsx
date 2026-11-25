import Link from 'next/link';
import { getIcon } from '@/tools/icons';
import type { ResolvedTool } from '@/tools/types';
import { ToolStatusBadge } from '@/components/ui/Badges';

export function ToolCard({ tool, delay = 0 }: { tool: ResolvedTool; delay?: number }) {
  const Icon = getIcon(tool.icon);
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="panel tool-card animate-fade-up"
      style={{ animationDelay: `${Math.min(delay, 400)}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="icon-tile">
          <Icon size={18} aria-hidden />
        </span>
        <ToolStatusBadge premium={tool.isPremium} native={tool.native} />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-zinc-50">{tool.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-400">{tool.description}</p>
      </div>
    </Link>
  );
}
