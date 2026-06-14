'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ReminderProgramItem } from '@/lib/services/reminder-service';
import { 
  Layers, 
  MoreVertical, 
  Calendar, 
  Play, 
  TrendingDown, 
  BarChart2, 
  CheckCheck, 
  HelpCircle, 
  Loader2 
} from 'lucide-react';

interface Props {
  program: ReminderProgramItem;
  onNewProgram: () => void;
}

function getBucketStyle(name: string): {
  icon: React.ComponentType<{ className?: string }>;
  borderColor: string;
  iconColor: string;
} {
  switch (name) {
    case 'Struggling':
      return {
        icon: TrendingDown,
        borderColor: 'border-l-error',
        iconColor: 'text-error',
      };
    case 'Intermediate':
      return {
        icon: BarChart2,
        borderColor: 'border-l-secondary',
        iconColor: 'text-secondary',
      };
    case 'Mastered':
      return {
        icon: CheckCheck,
        borderColor: 'border-l-tertiary',
        iconColor: 'text-tertiary',
      };
    default:
      return {
        icon: HelpCircle,
        borderColor: 'border-l-outline-variant',
        iconColor: 'text-on-surface-variant',
      };
  }
}

function BucketRow({
  bucket,
  isActive,
}: {
  bucket: ReminderProgramItem['buckets'][number];
  isActive: boolean;
}) {
  const style = getBucketStyle(bucket.name);
  const Icon = style.icon;

  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 border-l-[3px] bg-surface-container-low rounded-r-lg ${style.borderColor} ${
        !isActive ? 'opacity-60' : ''
      }`}
    >
      <Icon className={`h-5 w-5 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-on-surface">{bucket.name}</p>
          <span className="text-sm font-bold text-on-surface">
            {bucket.cards} cards
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-on-surface-variant">
            Every {bucket.intervalDays} days
          </p>
          <p className="text-xs text-on-surface-variant">Next: {bucket.next_date_label}</p>
        </div>
      </div>
    </div>
  );
}

export function ProgramCard({ program, onNewProgram }: Props) {
  const router = useRouter();
  const isActive = program.active;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reminders/${program.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !isActive }),
        });
        if (res.ok) {
          router.refresh();
        }
      } finally {
        setMenuOpen(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this reminder program?')) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reminders/${program.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          router.refresh();
        }
      } finally {
        setMenuOpen(false);
      }
    });
  }

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/15 transition-all duration-300 ${
        !isActive ? 'opacity-70 grayscale-[0.4]' : ''
      } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-on-surface">
              {program.name}
            </h2>
            {isActive ? (
              <span className="bg-tertiary/10 text-tertiary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Active
              </span>
            ) : (
              <span className="bg-surface-container-high text-on-surface-variant text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Layers className="h-3.5 w-3.5" />
            Deck: {program.deck_name}
          </div>
        </div>
        <div className="relative flex items-center">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-1" />
          ) : (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant cursor-pointer flex items-center justify-center"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          )}
          {menuOpen && !isPending && (
            <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
              <button
                onClick={handleToggle}
                className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                {isActive ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buckets */}
      <div className="space-y-2 mb-5">
        {program.buckets.map((bucket) => (
          <BucketRow key={bucket.name} bucket={bucket} isActive={isActive} />
        ))}
      </div>

      {/* Upcoming sessions or empty state */}
      {program.sessions.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Upcoming Sessions
          </p>
          <div className="flex gap-3 flex-wrap">
            {program.sessions.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-on-surface">
                    {s.date}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {s.cards} cards
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-5 py-4 text-center">
          <p className="text-sm text-on-surface-variant italic">
            No sessions scheduled
          </p>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            Resume to restart scheduling
          </p>
          <button
            onClick={onNewProgram}
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Resume Now
          </button>
        </div>
      )}
    </div>
  );
}
