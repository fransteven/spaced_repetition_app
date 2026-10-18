export type DeckFontSize = 'comfortable' | 'large' | 'extra-large';

export const DECK_FONT_OPTIONS: { value: DeckFontSize; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable · 18' },
  { value: 'large', label: 'Large · 20' },
  { value: 'extra-large', label: 'Extra large · 24' },
];

export const DECK_TYPOGRAPHY: Record<DeckFontSize, { title: string; body: string; metadata: string }> = {
  comfortable: { title: 'text-headline-md', body: 'text-lg', metadata: 'text-sm' },
  large: { title: 'text-headline-lg', body: 'text-xl', metadata: 'text-base' },
  'extra-large': { title: 'text-headline-lg', body: 'text-headline-md font-normal', metadata: 'text-lg' },
};

export function parseDeckFontSize(value: unknown): DeckFontSize {
  return value === 'large' || value === 'extra-large' ? value : 'comfortable';
}
