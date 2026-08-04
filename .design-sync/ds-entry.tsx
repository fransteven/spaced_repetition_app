// design-sync bundle entry. The app has no library build, so this file is the
// DS's public surface: the shadcn/base-ui primitives plus the presentational
// app components that render from props alone. Server-coupled components
// (study session, card editor, reminder/settings containers) are deliberately
// out of scope — they read the database or server actions.

// Must stay the first import — see the shim's header.
import './shims/process-global';

// ── Primitives (src/components/ui) ─────────────────────────────────────────
export * from '@/components/ui/button';
export * from '@/components/ui/input';
export * from '@/components/ui/textarea';
export * from '@/components/ui/label';
export * from '@/components/ui/select';
export * from '@/components/ui/dialog';
export * from '@/components/ui/app-logo';
export * from '@/components/ui/markdown-content';

// ── Decks ──────────────────────────────────────────────────────────────────
export * from '@/components/decks/DeckCard';
export * from '@/components/decks/empty-deck-card';

// ── Dashboard ──────────────────────────────────────────────────────────────
export * from '@/components/dashboard/dashboard-deck-card';
export * from '@/components/dashboard/timeline-list';
export * from '@/components/dashboard/activity-heatmap';

// ── Reminders ──────────────────────────────────────────────────────────────
export * from '@/components/reminders/bucket-row';
export * from '@/components/reminders/empty-state-card';
export * from '@/components/reminders/program-card';

// ── Layout / navigation ────────────────────────────────────────────────────
export * from '@/components/layout/sidebar';
export * from '@/components/layout/top-nav';
export * from '@/components/layout/mobile-nav';
export * from '@/components/layout/dashboard-shell';
