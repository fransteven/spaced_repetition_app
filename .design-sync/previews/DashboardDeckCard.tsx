import * as React from 'react';
import { DashboardDeckCard } from 'spaced_repetition_app';
import { FlaskConical, Languages, Sigma, Landmark } from 'lucide-react';

/** Cards due — solid primary CTA. */
export function DueNow(): React.JSX.Element {
  return (
    <DashboardDeckCard
      deckId="deck-organic-chem"
      icon={FlaskConical}
      title="Organic Chemistry"
      category="Science · 128 cards"
      mastery={48}
      due={17}
      iconBg="bg-primary/10"
      iconColor="text-primary"
    />
  );
}

/** Nothing due — outlined CTA and the neutral 0 due chip. */
export function NothingDue(): React.JSX.Element {
  return (
    <DashboardDeckCard
      deckId="deck-spanish"
      icon={Languages}
      title="Spanish B2 Vocabulary"
      category="English · 340 cards"
      mastery={58}
      due={0}
      iconBg="bg-tertiary/10"
      iconColor="text-tertiary"
    />
  );
}

/** The horizontal rail the dashboard actually renders. */
export function Rail(): React.JSX.Element {
  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      <DashboardDeckCard
        deckId="deck-organic-chem"
        icon={FlaskConical}
        title="Organic Chemistry"
        category="Science · 128 cards"
        mastery={48}
        due={17}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      <DashboardDeckCard
        deckId="deck-linear-algebra"
        icon={Sigma}
        title="Linear Algebra"
        category="Math · 96 cards"
        mastery={21}
        due={34}
        iconBg="bg-secondary/10"
        iconColor="text-secondary"
      />
      <DashboardDeckCard
        deckId="deck-world-history"
        icon={Landmark}
        title="World History"
        category="History · 212 cards"
        mastery={92}
        due={0}
        iconBg="bg-tertiary/10"
        iconColor="text-tertiary"
      />
    </div>
  );
}
