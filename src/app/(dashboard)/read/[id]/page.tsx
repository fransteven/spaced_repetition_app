import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getReaderData } from '@/lib/services/book-service';
import { getBookDeckOptions } from '@/lib/services/book-card-service';
import { ServiceError } from '@/lib/services/service-error';
import { Reader } from '@/components/reader/reader';

export const metadata: Metadata = {
  title: 'Reader — NeuroCards',
  description: 'Read, highlight and take notes.',
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cfi?: string | string[] }>;
};

export default async function ReadPage({ params, searchParams }: Props): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

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
      initialPreferences={data.preferences}
      initialDeckOptions={deckOptions}
      startCfi={typeof cfi === 'string' && cfi.startsWith('epubcfi(') ? cfi : null}
    />
  );
}
