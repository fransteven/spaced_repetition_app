import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { auth } from '@/lib/auth';
import { CANVAS_IFRAME_SANDBOX } from '@/lib/canvases/csp';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/primitives/pill';
import { CanvasActionsMenu } from '@/components/canvases/canvas-actions-menu';
import { loadCanvasOr404 } from './load';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: 'Canvas — NeuroCards' };
  const { id } = await params;
  const canvas = await loadCanvasOr404(session.user.id, id);
  return { title: `${canvas.title} — NeuroCards`, description: `Canvas: ${canvas.title}` };
}

/** Immersive viewer (no shell). The canvas runs in an opaque-origin sandbox: see src/lib/canvases/csp.ts. */
export default async function CanvasPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const canvas = await loadCanvasOr404(session.user.id, id);

  return (
    <div className="flex h-dvh flex-col bg-background text-on-surface">
      <header className="flex h-14 shrink-0 items-center gap-2 px-2 sm:h-16 sm:px-4">
        <Button
          variant="ghost"
          size="icon-lg"
          nativeButton={false}
          render={<Link href="/mind-maps/canvases" />}
          aria-label="Back to canvases"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body-sm font-semibold text-on-surface">{canvas.title}</h1>
          <p className="flex items-center gap-2 truncate text-label-sm text-on-surface-variant">
            AI-generated content
            {canvas.source === 'mcp' && (
              <Pill tone="primary" size="sm">
                <Sparkles className="size-3" />
                From AI
              </Pill>
            )}
          </p>
        </div>
        <CanvasActionsMenu id={canvas.id} title={canvas.title} />
      </header>
      <iframe
        title={canvas.title}
        src={`/api/canvases/${canvas.id}/raw`}
        sandbox={CANVAS_IFRAME_SANDBOX}
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 bg-surface-container-lowest"
      />
    </div>
  );
}
