import * as React from 'react';
import { AppLogo } from 'spaced_repetition_app';

/** The three sizes: sm in the top nav, md in the sidebar, lg on auth screens. */
export function Sizes(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <AppLogo size="sm" />
      <AppLogo size="md" />
      <AppLogo size="lg" />
    </div>
  );
}

/** Mark only — for collapsed rails and compact headers. */
export function MarkOnly(): React.JSX.Element {
  return (
    <div className="flex items-center gap-6">
      <AppLogo size="sm" showText={false} />
      <AppLogo size="md" showText={false} />
      <AppLogo size="lg" showText={false} />
    </div>
  );
}

/** With href the whole lockup becomes a link — how the nav uses it. */
export function AsLink(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <AppLogo size="md" href="/" />
      <p className="pl-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
        The Digital Curator
      </p>
    </div>
  );
}
