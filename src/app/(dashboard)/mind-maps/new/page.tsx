import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { MIND_MAP_STARTER, MindMapEditor } from '@/components/mind-maps/mind-map-editor';

export const metadata: Metadata = {
  title: 'New mind map — NeuroCards',
  description: 'Build a mind map from a Markdown outline.',
};

export default async function NewMindMapPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <>
      <PageHeader className="mb-6 sm:mb-8">
        <Link href="/mind-maps" className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft className="size-4" />
          Mind maps
        </Link>
        <h1 className="text-display-sm text-on-surface sm:text-display-md">New mind map</h1>
      </PageHeader>
      <PageSection>
        <MindMapEditor defaultValues={{ title: '', markdown: MIND_MAP_STARTER }} />
      </PageSection>
    </>
  );
}
