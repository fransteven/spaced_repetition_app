import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { MindMapEditor } from '@/components/mind-maps/mind-map-editor';
import { loadMindMapOr404 } from '../load';

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Edit mind map — NeuroCards',
  description: 'Edit the Markdown outline of a mind map.',
};

export default async function EditMindMapPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const map = await loadMindMapOr404(session.user.id, id);

  return (
    <>
      <PageHeader className="mb-6 sm:mb-8">
        <Link href={`/mind-maps/${map.id}`} className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft className="size-4" />
          {map.title}
        </Link>
        <h1 className="text-display-sm text-on-surface sm:text-display-md">Edit mind map</h1>
      </PageHeader>
      <PageSection>
        <MindMapEditor mindMapId={map.id} defaultValues={{ title: map.title, markdown: map.markdown }} />
      </PageSection>
    </>
  );
}
