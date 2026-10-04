import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { warmLlmService } from '@/lib/llm-client';
import { getReaderData } from '@/lib/services/book-service';
import { getBookDeckOptions } from '@/lib/services/book-card-service';
import { ServiceError } from '@/lib/services/service-error';
import { Reader } from '@/components/reader/reader';

export const metadata: Metadata = {
  title: 'Reader — NeuroCards',
  description: 'Read, highlight and take notes.',
};

// Translating, suggesting a card and asking the book (server actions of this page) may first wait for a sleeping
// srs-llm-api (LLM_WAKE_TIMEOUT_MS, 90 s) and then for the model.
export const maxDuration = 180;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cfi?: string | string[] }>;
};

export default async function ReadPage({ params, searchParams }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  // The AI service may be asleep (free hosting): start waking it while the book loads, so it is up when needed.
  after(() => warmLlmService().catch(() => undefined));

  const [{ id }, { cfi }] = await Promise.all([params, searchParams]);

  const data = await getReaderData(userId, id).catch((error: unknown) => {
    if (error instanceof ServiceError && error.code === 'UNAVAILABLE') redirect('/library');
    if (error instanceof ServiceError) notFound();
    throw error;
  });
  const deckOptions = await getBookDeckOptions(userId, data.book.id);

  return (
    <Reader
      key={data.book.id}
      book={data.book}
      initialAnnotations={data.annotations}
      initialBookmarks={data.bookmarks}
      initialPreferences={data.preferences}
      initialDeckOptions={deckOptions}
      startCfi={typeof cfi === 'string' && cfi.startsWith('epubcfi(') ? cfi : null}
    />
  );
}
