import * as React from 'react';
import { ActivityHeatmap } from 'spaced_repetition_app';

// Only these seven values map to a tint step; anything else renders untinted.
// Deterministic LCG so the card is byte-identical on every build.
function cells(count: number, bias: number[]): number[] {
  const out: number[] = [];
  let seed = 1337;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out.push(bias[seed % bias.length]);
  }
  return out;
}

/** ~12 weeks of review activity — the dashboard default. */
export function TwelveWeeks(): React.JSX.Element {
  return <ActivityHeatmap cells={cells(84, [0, 0, 10, 20, 20, 30, 40, 40, 60, 90, 30, 10])} />;
}

/** A new account: mostly untouched days. */
export function Sparse(): React.JSX.Element {
  return <ActivityHeatmap cells={cells(84, [0, 0, 0, 0, 10, 0, 20, 0, 0, 10])} />;
}

/** A daily-streak account: every day tinted, most of them heavily. */
export function Dense(): React.JSX.Element {
  return <ActivityHeatmap cells={cells(84, [40, 60, 90, 60, 90, 30, 90, 60, 40, 90])} />;
}
