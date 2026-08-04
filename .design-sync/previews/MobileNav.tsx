import * as React from 'react';
import { MobileNav } from 'spaced_repetition_app';

/** The bottom bar shown below lg: four destinations plus the raised
 *  create-deck action. It is `position: fixed` and pins to the viewport
 *  bottom; pages leave room with `pb-24`. */
export function BottomBar(): React.JSX.Element {
  return (
    <div className="min-h-[240px] bg-background">
      <div className="px-4 pt-4">
        <p className="text-sm text-on-surface-variant">
          Page content ends above the bar (pb-24).
        </p>
      </div>
      <MobileNav />
    </div>
  );
}
