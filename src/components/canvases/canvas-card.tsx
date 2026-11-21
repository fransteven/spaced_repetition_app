import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { AppWindow, Sparkles } from 'lucide-react';

import { Surface } from '@/components/primitives/surface';
import { Pill } from '@/components/primitives/pill';
import type { CanvasSummary } from '@/lib/services/canvas-service';

export function formatCanvasSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CanvasCard({ canvas, index }: { canvas: CanvasSummary; index: number }): React.JSX.Element {
  return (
    <Link
      href={`/mind-maps/canvases/${canvas.id}`}
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
            <AppWindow className="size-5" />
          </div>
          {canvas.source === 'mcp' && (
            <Pill tone="primary" size="sm">
              <Sparkles className="size-3" />
              From AI
            </Pill>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-headline-sm break-words text-on-surface">{canvas.title}</h3>
          {canvas.description && <p className="text-body-sm break-words text-on-surface-variant">{canvas.description}</p>}
        </div>
        <p className="mt-auto text-body-sm text-on-surface-variant">
          {canvas.deck_name && <>{canvas.deck_name} · </>}
          <span className="tabular">{formatCanvasSize(canvas.size_bytes)}</span> · updated{' '}
          {formatDistanceToNow(canvas.updated_at, { addSuffix: true })}
        </p>
      </Surface>
    </Link>
  );
}
