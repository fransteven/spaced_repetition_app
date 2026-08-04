'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  CreateReminderProgramSchema,
} from '@/lib/validations';
import { X, ChevronDown, Info } from 'lucide-react';
import type { z } from 'zod';
import type { DeckListPageItem } from '@/lib/services/deck-service';

type FormValues = z.infer<typeof CreateReminderProgramSchema>;

interface Props {
  decks: DeckListPageItem[];
  onClose: () => void;
}

interface BucketPreview {
  name: string;
  cards: number;
  intervalDays: number;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-tertiary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function getBucketDot(name: string): string {
  if (name === 'Struggling') return 'bg-error';
  if (name === 'Intermediate') return 'bg-secondary';
  if (name === 'Mastered') return 'bg-tertiary';
  return 'bg-on-surface-variant';
}

export default function NewReminderModal({ decks, onClose }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<BucketPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateReminderProgramSchema),
    defaultValues: {
      name: '',
      deck_id: decks[0]?.id ?? '',
      enable_email: true,
    },
  });

  const deckId = watch('deck_id');
  const enableEmail = watch('enable_email');

  useEffect(() => {
    if (!deckId) {
      setPreview([]);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    fetch(`/api/reminders/preview?deckId=${encodeURIComponent(deckId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!cancelled) {
          if (json.data) {
            setPreview(json.data);
          } else {
            setPreview([]);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPreview([]);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json.error?.message ?? 'Failed to create program';
        setErrorMessage(msg);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface-container-lowest w-full max-w-[680px] rounded-xl shadow-2xl overflow-hidden border border-outline-variant/20"
      >
        {/* Header */}
        <div className="px-6 sm:px-10 py-8">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              New Reminder Program
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center"
            >
              <X className="h-5 w-5 text-on-surface-variant" />
            </button>
          </div>
          <p className="text-on-surface-variant text-sm">
            Configure your bespoke learning schedule.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 sm:px-10 pb-10 space-y-8">
          {/* Name + Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Program name
              </label>
              <input
                type="text"
                placeholder="e.g. Morning Phrasal Drills"
                className="w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg px-4 py-3 text-sm transition-all outline-none"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-error">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Select deck
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg px-4 py-3 text-sm pr-10 cursor-pointer outline-none"
                  {...register('deck_id')}
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant h-5 w-5" />
              </div>
              {errors.deck_id && (
                <p className="text-xs text-error">{errors.deck_id.message}</p>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-primary-container/10 border-l-4 border-primary p-5 rounded-r-lg flex gap-4">
            <Info className="text-primary shrink-0 h-5 w-5" />
            <p className="text-sm leading-relaxed text-on-primary-fixed-variant">
              Cards will be automatically grouped into 3 buckets based on memory
              strength and scheduled accordingly.
            </p>
          </div>

          {/* Bucket preview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Memory Bucket Preview
            </h3>
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 px-6 py-3 border-b border-outline-variant/10 bg-surface-container-high/50">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Bucket Name
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase text-center">
                  Card Count
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase text-right">
                  Interval
                </span>
              </div>
              {previewLoading ? (
                <div className="px-6 py-6 text-center text-sm text-on-surface-variant">
                  Loading preview...
                </div>
              ) : preview.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-on-surface-variant">
                  No cards in this deck yet.
                </div>
              ) : (
                preview.map((b, i) => (
                  <div
                    key={b.name}
                    className={`grid grid-cols-3 px-6 py-4 items-center ${
                      i > 0 ? 'border-t border-outline-variant/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getBucketDot(b.name)}`} />
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <span className="text-sm text-center font-semibold">
                      {b.cards} cards
                    </span>
                    <span className="text-sm text-right text-on-surface-variant">
                      Every {b.intervalDays} days
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Email reminders</p>
                <p className="text-xs text-on-surface-variant">
                  Daily digest at 8:00 AM when a bucket comes due
                </p>
              </div>
              <Toggle
                checked={enableEmail}
                onChange={() => setValue('enable_email', !enableEmail)}
              />
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="bg-error-container/10 border-l-4 border-error p-4 rounded-r-lg">
              <p className="text-sm text-on-error-container">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-6 sm:px-10 py-6 flex justify-end items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-container px-8 py-2.5 rounded-lg text-on-primary text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </form>
    </div>
  );
}
