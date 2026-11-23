'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Layers, TriangleAlert } from 'lucide-react';

import { PageSection } from '@/components/layout/page-header';
import { EmptyState } from '@/components/primitives/empty-state';
import { OfflineFrame } from '@/components/offline/offline-frame';
import { StudyOutcome } from '@/components/study/study-outcome';
import { StudySession } from '@/components/study/study-session';
import { buttonVariants } from '@/components/ui/button';
import { previewIntervals } from '@/lib/fsrs/algorithm';
import { getDeck, getDeckCards, type OfflineCardRecord } from '@/lib/offline/deck-download';
import { scheduleFromWire } from '@/lib/offline/schedule-wire';
import type { StudyCardItem } from '@/lib/services/study-service';
import { orderStudyCards } from '@/lib/study/order-cards';

type LoadState =
  | { deckId: string; status: 'missing' }
  | { deckId: string; status: 'error' }
  | { deckId: string; status: 'ready'; deckName: string; cards: StudyCardItem[] };

/** Same queue and item shape as getStudySession() on the server, from the downloaded copy. */
function buildQueue(records: readonly OfflineCardRecord[], now: Date): StudyCardItem[] {
  // orderStudyCards keeps only due cards and new ones (the server's `due_date <= now OR state = 'new'`).
  const ordered = orderStudyCards(
    records.map((record) => ({
      record,
      state: record.schedule.state,
      stability: record.schedule.stability,
      due_date: record.schedule.due_date,
    })),
    now,
  );
  return ordered.map(({ record }) => ({
    card_id: record.card_id,
    front: record.front,
    back: record.back,
    image_url_1: record.image_url_1,
    image_url_2: record.image_url_2,
    stability: record.schedule.stability,
    state: record.schedule.state,
    previews: previewIntervals(scheduleFromWire(record.schedule), now),
    source: record.source,
  }));
}

function DownloadsLink(): React.JSX.Element {
  return (
    <Link href="/offline" className={buttonVariants({ size: 'lg' })}>
      Go to downloads
    </Link>
  );
}

/** Studies a downloaded deck (`?deck=`) from IndexedDB; reviews sync when back online. */
export function OfflineStudyShell(): React.JSX.Element {
  const params = useSearchParams();
  const deckId = params.get('deck');
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    (async (): Promise<LoadState> => {
      const deck = await getDeck(deckId);
      if (!deck) return { deckId, status: 'missing' };
      const records = await getDeckCards(deckId);
      return { deckId, status: 'ready', deckName: deck.name, cards: buildQueue(records, new Date()) };
    })()
      .catch((error: unknown): LoadState => {
        console.error('[OfflineStudyShell]', error);
        return { deckId, status: 'error' };
      })
      .then((next) => {
        if (!cancelled) setLoaded(next);
      });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  if (!deckId) {
    return (
      <OfflineFrame>
        <PageSection data-slot="offline-study">
          <EmptyState
            icon={<Layers />}
            title="No deck selected"
            body="Choose a downloaded deck to study without a connection."
            action={<DownloadsLink />}
          />
        </PageSection>
      </OfflineFrame>
    );
  }

  const state = loaded?.deckId === deckId ? loaded : null;

  if (!state) {
    return (
      <OfflineFrame>
        <PageSection data-slot="offline-study" data-deck-id={deckId} aria-busy="true" />
      </OfflineFrame>
    );
  }

  if (state.status !== 'ready') {
    return (
      <OfflineFrame>
        <PageSection data-slot="offline-study" data-deck-id={deckId}>
          <EmptyState
            icon={state.status === 'missing' ? <Layers /> : <TriangleAlert />}
            title={state.status === 'missing' ? 'Deck not downloaded' : 'Could not open this deck'}
            body={
              state.status === 'missing'
                ? 'Download this deck while you are online to study it without a connection.'
                : 'The downloaded copy could not be read on this device. Try downloading it again.'
            }
            action={<DownloadsLink />}
          />
        </PageSection>
      </OfflineFrame>
    );
  }

  if (state.cards.length === 0) {
    return <StudyOutcome variant="caught-up" deckId={deckId} deckName={state.deckName} offline />;
  }

  return (
    <div data-slot="offline-study" data-deck-id={deckId}>
      <StudySession
        offline
        deckId={deckId}
        deckName={state.deckName}
        initialCards={state.cards}
        // No streak offline: the completion screen shows it as local, updated after sync.
        streakDays={0}
        reviewedTodayBeforeSession={false}
      />
    </div>
  );
}
