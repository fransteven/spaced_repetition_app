import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Network, Sparkles } from 'lucide-react';

import { Surface } from '@/components/primitives/surface';
import { Pill } from '@/components/primitives/pill';
import type { MindMapSummary } from '@/lib/services/mind-map-service';

export function MindMapCard({ map, index }: { map: MindMapSummary; index: number }): React.JSX.Element {
  return (
    <Link
      href={`/mind-maps/${map.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Surface
        tone="card"
        interactive
        className="flex h-full animate-rise-in flex-col gap-4 p-5 sm:p-6"
        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Network className="size-5" />
          </div>
          {map.source === 'mcp' && (
            <Pill tone="primary" size="sm">
              <Sparkles className="size-3" />
              From AI
            </Pill>
          )}
        </div>
        <h3 className="text-headline-sm break-words text-on-surface">{map.title}</h3>
        <p className="mt-auto text-body-sm text-on-surface-variant">
          <span className="tabular">{map.node_count}</span> nodes · updated{' '}
          {formatDistanceToNow(map.updated_at, { addSuffix: true })}
        </p>
      </Surface>
    </Link>
  );
}
