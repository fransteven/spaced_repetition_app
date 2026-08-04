import * as React from 'react';
import { Sidebar } from 'spaced_repetition_app';

/** The fixed desktop rail. It is `position: fixed` and `hidden lg:flex`, so it
 *  only appears at lg+ widths and pins itself to the left of the viewport —
 *  page content is offset with `lg:ml-64` (see DashboardShell). */
export function DesktopRail(): React.JSX.Element {
  return (
    <div className="min-h-[720px] bg-background">
      <Sidebar />
    </div>
  );
}
