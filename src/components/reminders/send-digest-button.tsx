'use client';

import { useState, useTransition } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { sendDigestNowAction } from '@/app/actions/reminder-actions';

export function SendDigestButton() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleClick() {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendDigestNowAction();
      setFeedback(
        result.success
          ? 'Digest queued — check your inbox in a moment.'
          : result.error ?? 'Could not queue the digest.'
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {isPending ? 'Sending...' : 'Send now'}
      </button>
      {feedback && (
        <p className="text-xs text-on-surface-variant">{feedback}</p>
      )}
    </div>
  );
}
