import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { auth } from '@/lib/auth';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { Pill } from '@/components/primitives/pill';
import { MindMapCanvas } from '@/components/mind-maps/mind-map-canvas';
import { MindMapActionsMenu } from '@/components/mind-maps/mind-map-actions-menu';
import { parseMindMapMarkdown } from '@/lib/mind-maps/parse-markdown';
import { loadMindMapOr404 } from './load';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: 'Mind map — NeuroCards' };
  const { id } = await params;
  const map = await loadMindMapOr404(session.user.id, id);
  return { title: `${map.title} — NeuroCards`, description: `Mind map: ${map.title}` };
}

export default async function MindMapPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const map = await loadMindMapOr404(session.user.id, id);
  const tree = parseMindMapMarkdown(map.markdown, map.title);

  return (
    <>
      <PageHeader className="mb-6 sm:mb-8">
        <Link href="/mind-maps" className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft className="size-4" />
          Mind maps
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-display-sm break-words text-on-surface sm:text-display-md">{map.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
              <span className="tabular">{map.node_count} nodes</span>
              <span aria-hidden>·</span>
              <span>updated {formatDistanceToNow(map.updated_at, { addSuffix: true })}</span>
              {map.source === 'mcp' && (
                <Pill tone="primary" size="sm">
                  <Sparkles className="size-3" />
                  From AI
                </Pill>
              )}
            </p>
          </div>
          <MindMapActionsMenu id={map.id} title={map.title} markdown={map.markdown} />
        </div>
      </PageHeader>
      <PageSection>
        <MindMapCanvas root={tree} fitKey={map.id} className="h-[65dvh] min-h-96 lg:h-[calc(100dvh-17rem)]" />
      </PageSection>
    </>
  );
}
