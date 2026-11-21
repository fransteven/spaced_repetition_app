import Link from 'next/link';

import { filterChipClassName } from '@/components/primitives/filter-chip';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'maps', label: 'Mind maps', href: '/mind-maps' },
  { key: 'canvases', label: 'Canvases', href: '/mind-maps/canvases' },
] as const;

export type MindMapsTab = (typeof TABS)[number]['key'];

/** Mind maps and canvases share one nav item; each tab is its own route, so each chip is a real link. */
export function MindMapsTabs({ active, className }: { active: MindMapsTab; className?: string }): React.JSX.Element {
  return (
    <nav aria-label="Mind maps and canvases" className={cn('flex flex-wrap gap-2', className)}>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={filterChipClassName(tab.key === active)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
