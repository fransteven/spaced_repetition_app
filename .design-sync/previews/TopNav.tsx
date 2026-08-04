import * as React from 'react';
import { TopNav } from 'spaced_repetition_app';

/** The fixed, blurred top bar: logo, search, settings and account cluster.
 *  Pages leave room for it with `pt-24`. */
export function Bar(): React.JSX.Element {
  return (
    <div className="min-h-[200px] bg-background">
      <TopNav />
      <div className="pt-24 px-8">
        <p className="text-sm text-on-surface-variant">
          Page content starts below the bar (pt-24).
        </p>
      </div>
    </div>
  );
}
