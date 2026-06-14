import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';
import { DashboardDeckCard } from '@/components/dashboard/dashboard-deck-card';
import type { DashboardDeck } from '@/components/dashboard/dashboard-deck-card';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { TimelineList } from '@/components/dashboard/timeline-list';
import { Languages, Atom, Calculator, BookOpen, Layers, ArrowRight, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard — NeuroCards',
  description: 'Your spaced repetition study overview',
};

const SUBJECT_ICON = {
  english:   { icon: Languages,   iconBg: 'bg-primary/5',              iconColor: 'text-primary' },
  science:   { icon: Atom,        iconBg: 'bg-secondary-container/20', iconColor: 'text-secondary' },
  math:      { icon: Calculator,  iconBg: 'bg-tertiary/5',             iconColor: 'text-tertiary' },
  history:   { icon: BookOpen,    iconBg: 'bg-primary/5',              iconColor: 'text-primary' },
};

const DEFAULT_ICON = { icon: Layers, iconBg: 'bg-surface-container-high', iconColor: 'text-on-surface-variant' };

function subjectIcon(subject: string) {
  return SUBJECT_ICON[subject.toLowerCase() as keyof typeof SUBJECT_ICON] ?? DEFAULT_ICON;
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const data = await getDashboardData(session.user.id);

  const deckCards: DashboardDeck[] = data.decks.map(d => ({
    deckId:    d.id,
    title:     d.name,
    category:  d.subject,
    mastery:   d.mastery,
    due:       d.due_count,
    ...subjectIcon(d.subject),
  }));

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-16">
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
          <span className="text-primary font-bold text-5xl tracking-tight">{data.stats.dueToday}</span>
          <span className="text-on-surface font-semibold text-lg">Cards due today</span>
          <span className="text-on-surface-variant text-sm">
            {data.stats.dueDeckCount > 0
              ? `across ${data.stats.dueDeckCount} deck${data.stats.dueDeckCount > 1 ? 's' : ''}`
              : 'all caught up'}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl">🔥</span>
            <span className="text-on-surface font-bold text-5xl tracking-tight">
              {data.stats.streakDays} {data.stats.streakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <span className="text-on-surface font-semibold text-lg">Study streak</span>
          <span className="text-on-surface-variant text-sm">
            {data.stats.streakDays > 0 ? 'Keep it up!' : 'Study today to start a streak'}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl ring-1 ring-outline-variant/10 shadow-[0px_12px_32px_rgba(25,28,29,0.02)] flex flex-col gap-1">
          <span className="text-tertiary font-bold text-5xl tracking-tight">{data.stats.masteredTotal}</span>
          <span className="text-on-surface font-semibold text-lg">Mastered cards</span>
          <span className="text-on-surface-variant text-sm">stability ≥ 50 days</span>
        </div>
      </section>

      <section className="mb-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Your Decks</h2>
            <p className="text-on-surface-variant mt-1">
              {deckCards.length > 0
                ? `Reviewing ${deckCards.length} deck${deckCards.length > 1 ? 's' : ''} today.`
                : 'No decks yet.'}
            </p>
          </div>
          <Link
            href="/decks"
            className="text-primary font-semibold flex items-center gap-2 hover:underline"
          >
            View all decks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {deckCards.length > 0 ? (
          <div className="flex overflow-x-auto gap-6 md:gap-8 pb-4 no-scrollbar -mx-2 px-2">
            {deckCards.map(deck => (
              <DashboardDeckCard key={deck.deckId} {...deck} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-on-surface-variant flex flex-col items-center">
            <Layers className="h-12 w-12 mb-4 text-on-surface-variant/40" />
            <p className="font-semibold">No decks yet.</p>
            <p className="text-sm mt-1">Create your first deck to get started.</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <section className="lg:col-span-2">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Activity</h2>
            <p className="text-on-surface-variant text-sm">Last 70 days of study</p>
          </div>
          <ActivityHeatmap cells={data.heatmap} />
        </section>

        <section className="lg:col-span-1">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Timeline</h2>
            <p className="text-on-surface-variant text-sm">Upcoming reviews</p>
          </div>
          {data.timeline.length > 0 ? (
            <TimelineList timeline={data.timeline} />
          ) : (
            <p className="text-on-surface-variant text-sm">No upcoming reviews scheduled.</p>
          )}
        </section>
      </div>

      <Link
        href="/decks"
        className="hidden md:flex fixed bottom-10 right-10 w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg items-center justify-center hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </>
  );
}
