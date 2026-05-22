'use client';

import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { ReminderProgramItem } from '@/lib/services/reminder-service';

interface Props {
  program: ReminderProgramItem;
  onNewProgram: () => void;
}

function getBucketStyle(name: string): {
  icon: string;
  borderColor: string;
  iconColor: string;
} {
  switch (name) {
    case 'Struggling':
      return {
        icon: 'trending_down',
        borderColor: 'border-l-error',
        iconColor: 'text-error',
      };
    case 'Intermediate':
      return {
        icon: 'bar_chart',
        borderColor: 'border-l-secondary',
        iconColor: 'text-secondary',
      };
    case 'Mastered':
      return {
        icon: 'done_all',
        borderColor: 'border-l-tertiary',
        iconColor: 'text-tertiary',
      };
    default:
      return {
        icon: 'help',
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
  const next = format(addDays(new Date(), bucket.intervalDays), 'MMM d');

  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 border-l-[3px] bg-surface-container-low rounded-r-lg ${style.borderColor} ${
        !isActive ? 'opacity-60' : ''
      }`}
    >
      <span className={`material-symbols-outlined text-xl ${style.iconColor}`}>
        {style.icon}
      </span>
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
          <p className="text-xs text-on-surface-variant">Next: {next}</p>
        </div>
      </div>
    </div>
  );
}

export function ProgramCard({ program, onNewProgram }: Props) {
  const router = useRouter();
  const isActive = program.active;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
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
      setLoading(false);
      setMenuOpen(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this reminder program?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders/${program.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] border border-outline-variant/15 ${
        !isActive ? 'opacity-70 grayscale-[0.4]' : ''
      }`}
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
            <span className="material-symbols-outlined text-sm">style</span>
            Deck: {program.deck_name}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={loading}
            className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-xl">
              more_vert
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
              <button
                onClick={handleToggle}
                className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                {isActive ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-error hover:bg-surface-container-low transition-colors"
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
                <span className="material-symbols-outlined text-primary text-base">
                  event
                </span>
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
            className="mt-3 inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">
              play_arrow
            </span>
            Resume Now
          </button>
        </div>
      )}
    </div>
  );
}
