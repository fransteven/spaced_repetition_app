import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppWindow } from 'lucide-react';

import { auth } from '@/lib/auth';
import { PageHeader, PageSection } from '@/components/layout/page-header';
import { SectionHeading } from '@/components/primitives/section-heading';
import { EmptyState } from '@/components/primitives/empty-state';
import { MindMapsTabs } from '@/components/mind-maps/mind-maps-tabs';
import { CanvasCard } from '@/components/canvases/canvas-card';
import { CanvasUploadButton } from '@/components/canvases/canvas-upload-button';
import { CopyCanvasPromptButton } from '@/components/canvases/copy-canvas-prompt-button';
import { MAX_CANVASES_PER_USER } from '@/lib/canvases/limits';
import { listCanvases } from '@/lib/services/canvas-service';

export const metadata: Metadata = {
  title: 'Canvases — NeuroCards',
  description: 'Interactive HTML explainers made by your AI assistant, kept next to your mind maps.',
};

export default async function CanvasesPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const items = await listCanvases(session.user.id);
  const upload = <CanvasUploadButton disabled={items.length >= MAX_CANVASES_PER_USER} />;

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-md text-on-surface sm:text-display-lg">Canvases</h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          Keep the interactive explainers that Claude, ChatGPT or Gemini build for you as HTML. They run isolated
          from your account.
        </p>
        <MindMapsTabs active="canvases" className="mt-6" />
      </PageHeader>

      <PageSection className="space-y-6 sm:space-y-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<AppWindow />}
            title="Save your first canvas"
            body="Ask an AI assistant to explain an idea as an interactive HTML page, then upload the file here. Copy the prompt so it works in NeuroCards."
            action={
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                {upload}
                <CopyCanvasPromptButton />
              </div>
            }
          />
        ) : (
          <>
            <SectionHeading
              title="Your canvases"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <CopyCanvasPromptButton />
                  {upload}
                </div>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {items.map((canvas, index) => (
                <CanvasCard key={canvas.id} canvas={canvas} index={index} />
              ))}
            </div>
          </>
        )}
      </PageSection>
    </>
  );
}
