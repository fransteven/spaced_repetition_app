import * as React from 'react';
import { EmptyStateCard } from 'spaced_repetition_app';

const noop = (): void => {};

/** The reminders page with no programs yet. */
export function NoPrograms(): React.JSX.Element {
  return (
    <div className="max-w-2xl">
      <EmptyStateCard onNewProgram={noop} />
    </div>
  );
}

/** How the reminders page frames it: page heading above the dashed tile. */
export function InPageContext(): React.JSX.Element {
  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Reminders
        </p>
        <h1 className="text-3xl font-black tracking-tight text-on-surface">
          No programs yet
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Reminder programs bucket a deck&apos;s cards by stability and put the reviews on your
          calendar.
        </p>
      </header>
      <EmptyStateCard onNewProgram={noop} />
    </div>
  );
}
