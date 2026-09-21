import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';
import { DashboardDeckCard } from '@/components/dashboard/dashboard-deck-card';
import type { DashboardDeck } from '@/components/dashboard/dashboard-deck-card';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { TimelineList } from '@/components/dashboard/timeline-list';
import { PageSection } from '@/components/layout/page-header';
import { StatCard } from '@/components/primitives/stat-card';
import { SectionHeading } from '@/components/primitives/section-heading';
import { StreakBadge } from '@/components/primitives/streak-badge';
import { EmptyState } from '@/components/primitives/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Languages,
  Atom,
  Calculator,
  BookOpen,
  Layers,
  ArrowRight,
  Plus,
  Sparkles,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard — NeuroCards',
  description: 'Track your daily review progress, retention stats, and memory stability.',
};

const SUBJECT_ICON: Record<string, { icon: LucideIcon; iconBg: string; iconColor: string }> = {
  english: { icon: Languages, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  science: { icon: Atom, iconBg: 'bg-secondary/10', iconColor: 'text-secondary' },
  math: { icon: Calculator, iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary' },
  history: { icon: BookOpen, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
};

const DEFAULT_ICON = {
  icon: Layers,
  iconBg: 'bg-surface-container-high',
  iconColor: 'text-on-surface-variant',
};

function subjectIcon(subject: string) {
  return SUBJECT_ICON[subject.toLowerCase()] ?? DEFAULT_ICON;
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const data = await getDashboardData(session.user.id);

  const deckCards: DashboardDeck[] = data.decks.map((d) => ({
    deckId: d.id,
    title: d.name,
    category: d.subject,
    mastery: d.mastery,
    due: d.due_count,
    ...subjectIcon(d.subject),
  }));

  // Identify next deck to study
  const prioritizedDeck = data.decks
    .filter((deck) => deck.due_count > 0)
    .sort((a, b) => b.due_count - a.due_count)[0];

  // Daily goal calculation: reviewed today vs total expected
  const totalGoalCards = data.stats.reviewedToday + data.stats.dueToday;
  const goalProgress =
    totalGoalCards > 0
      ? Math.min(100, Math.round((data.stats.reviewedToday / totalGoalCards) * 100))
      : 100;
  const isGoalComplete = data.stats.dueToday === 0;

  // SVG ring parameters (radius 48, viewBox 120x120)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalProgress / 100) * circumference;

  return (
    <PageSection className="space-y-10 sm:space-y-12">
      {/* ── 1. Session Hero (Calm & Reward) ────────────────── */}
      <section className="bg-surface-container-low rounded-2xl p-6 sm:p-8 lg:p-10 shadow-ambient flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="text-body-md text-on-surface-variant">
              Welcome back, {session.user.name?.split(' ')[0] ?? 'Scholar'}
            </span>
            <StreakBadge days={data.stats.streakDays} size="sm" />
          </div>

          <h1 className="text-display-md text-on-surface tracking-tight">
            {isGoalComplete ? "You're all caught up!" : "Time to reinforce memory"}
          </h1>

          <p className="text-body-md text-on-surface-variant max-w-xl leading-relaxed">
            {isGoalComplete
              ? "All scheduled flashcards have been reviewed today. Explore your decks or take a well-earned break."
              : `You have ${data.stats.dueToday} card${data.stats.dueToday === 1 ? '' : 's'} waiting for review across ${data.stats.dueDeckCount} deck${data.stats.dueDeckCount === 1 ? '' : 's'}. Immediate recall strengthens long-term retention.`}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4">
            {prioritizedDeck ? (
              <Link
                href={`/study/${prioritizedDeck.id}`}
                className={cn(buttonVariants({ size: 'xl' }), 'font-semibold shadow-ambient')}
              >
                <BookMarked className="size-5" />
                Continue studying ({prioritizedDeck.due_count} due)
              </Link>
            ) : data.decks.length > 0 ? (
              <Link
                href="/decks"
                className={cn(buttonVariants({ size: 'xl' }), 'font-semibold')}
              >
                <Sparkles className="size-5" />
                Browse your decks
              </Link>
            ) : (
              <Link
                href="/decks"
                className={cn(buttonVariants({ size: 'xl' }), 'font-semibold')}
              >
                <Plus className="size-5" />
                Create your first deck
              </Link>
            )}

            {prioritizedDeck && (
              <Link
                href="/decks"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'xl' }),
                  'text-on-surface-variant'
                )}
              >
                Browse decks
              </Link>
            )}
          </div>
        </div>

        {/* Daily Goal Radial Ring */}
        <div className="shrink-0 flex flex-col items-center justify-center relative">
          <div className="relative size-36 sm:size-40 flex items-center justify-center">
            <svg
              className="size-full -rotate-90"
              viewBox="0 0 120 120"
              aria-label={`Daily study goal: ${goalProgress}% complete`}
            >
              {/* Background circle track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-surface-container-high fill-none"
                strokeWidth="10"
              />
              {/* Animated Progress circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className={isGoalComplete ? "stroke-state-mastered fill-none animate-celebrate" : "stroke-primary fill-none transition-all duration-700"}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner metric display */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-metric-lg tabular text-on-surface">
                {data.stats.dueToday}
              </span>
              <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                {isGoalComplete ? 'All clear' : 'Due today'}
              </span>
            </div>
          </div>
          <span className="text-body-sm text-on-surface-variant mt-2 font-medium">
            {data.stats.reviewedToday} of {totalGoalCards} reviewed
          </span>
        </div>
      </section>

      {/* ── 2. Stat Cards Grid ──────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Cards due today"
          value={data.stats.dueToday}
          tone="struggling"
          hint={
            data.stats.dueDeckCount > 0
              ? `Across ${data.stats.dueDeckCount} deck${data.stats.dueDeckCount > 1 ? 's' : ''}`
              : 'All caught up'
          }
        />

        <StatCard
          label="Study streak"
          value={`${data.stats.streakDays} ${data.stats.streakDays === 1 ? 'day' : 'days'}`}
          tone="streak"
          hint={data.stats.streakDays > 0 ? 'Consistent practice builds memory' : 'Study today to ignite your streak'}
        />

        <StatCard
          label="Mastered cards"
          value={data.stats.masteredTotal}
          tone="mastered"
          hint="Stability ≥ 50 days (FSRS 4.5)"
        />
      </section>

      {/* ── 3. Decks Carousel ───────────────────────────────── */}
      <section>
        <SectionHeading
          title="Your Decks"
          description={
            deckCards.length > 0
              ? `Reviewing ${deckCards.length} deck${deckCards.length > 1 ? 's' : ''} on schedule.`
              : 'No decks yet.'
          }
          action={
            <Link
              href="/decks"
              className="text-primary text-body-sm font-semibold flex items-center gap-1.5 hover:underline"
            >
              View all decks <ArrowRight className="size-4" />
            </Link>
          }
        />

        {deckCards.length > 0 ? (
          <div className="relative">
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 no-scrollbar [mask-image:linear-gradient(to_right,black_85%,transparent)]">
              {deckCards.map((deck) => (
                <DashboardDeckCard key={deck.deckId} {...deck} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="size-9" />}
            title="Mental space"
            body="No decks created yet. Build your first intellectual stack and the FSRS schedule takes care of the rest."
            action={
              <Link
                href="/decks"
                className={cn(buttonVariants({ size: 'lg' }), 'font-semibold')}
              >
                <Plus className="size-4" />
                Create deck
              </Link>
            }
          />
        )}
      </section>

      {/* ── 4. Activity & Timeline ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        <section className="lg:col-span-2">
          <SectionHeading
            title="Activity"
            description="Daily review frequency over the last 70 days"
          />
          <ActivityHeatmap cells={data.heatmap} />
        </section>

        <section className="lg:col-span-1">
          <SectionHeading
            title="Timeline"
            description="Upcoming scheduled reviews"
          />
          {data.timeline.length > 0 ? (
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl">
              <TimelineList timeline={data.timeline} />
            </div>
          ) : (
            <div className="bg-surface-container-low p-6 sm:p-8 rounded-2xl text-center text-body-sm text-on-surface-variant">
              No upcoming reviews scheduled.
            </div>
          )}
        </section>
      </div>

      {/* ── 5. Desktop Floating Action Button ───────────────── */}
      <Link
        href="/decks"
        aria-label="Create new deck"
        className="hidden lg:flex fixed bottom-10 right-10 size-14 bg-primary text-on-primary rounded-full shadow-ambient-lg items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40 cursor-pointer"
      >
        <Plus className="size-7" />
      </Link>
    </PageSection>
  );
}
