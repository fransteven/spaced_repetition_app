import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Network, Plus } from 'lucide-react';

import { auth } from '@/lib/auth';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { SectionHeading } from '@/components/primitives/section-heading';
import { EmptyState } from '@/components/primitives/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { MindMapCard } from '@/components/mind-maps/mind-map-card';
import { listMindMaps } from '@/lib/services/mind-map-service';

export const metadata: Metadata = {
  title: 'Mind maps — NeuroCards',
  description: 'Mental models of a topic, built from a Markdown outline or by your AI assistant.',
};

export default async function MindMapsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const maps = await listMindMaps(session.user.id);
  const create = (
    <Link href="/mind-maps/new" className={buttonVariants({ size: 'xl' })}>
      <Plus data-icon="inline-start" />
      New mind map
    </Link>
  );

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-md text-on-surface sm:text-display-lg">Mind maps</h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          See a whole topic at once. Write an outline in Markdown, or ask Claude or ChatGPT to build the map and
          save it here.
        </p>
      </PageHeader>

      <PageSection className="space-y-6 sm:space-y-8">
        {maps.length === 0 ? (
          <EmptyState
            icon={<Network />}
            title="Map your first topic"
            body={
              <>
                Paste a Markdown outline, or{' '}
                <Link href="/settings#ai-assistants" className="font-semibold text-primary underline-offset-4 hover:underline">
                  connect your AI assistant
                </Link>{' '}
                and ask it for a mind map.
              </>
            }
            action={create}
          />
        ) : (
          <>
            <SectionHeading
              title="Your mind maps"
              description={
                <Link href="/settings#ai-assistants" className="text-primary underline-offset-4 hover:underline">
                  Create them from Claude or ChatGPT
                </Link>
              }
              action={create}
            />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {maps.map((map, index) => (
                <MindMapCard key={map.id} map={map} index={index} />
              ))}
            </div>
          </>
        )}
      </PageSection>
    </>
  );
}
