'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { formatSubject } from '@/lib/subject-accent';
import { DeckCard, type DeckWithStats } from '@/components/decks/DeckCard';
import { EmptyDeckCard } from '@/components/decks/empty-deck-card';
import { CreateDeckDialog } from '@/components/decks/CreateDeckDialog';
import { EditDeckDialog } from '@/components/decks/EditDeckDialog';
import { DeleteDeckDialog } from '@/components/decks/DeleteDeckDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSection } from '@/components/layout/page-header';

interface DeckListProps {
  decks: DeckWithStats[];
}

export function DeckList({ decks }: DeckListProps): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDeck, setEditDeck] = useState<DeckWithStats | null>(null);
  const [deleteDeck, setDeleteDeck] = useState<DeckWithStats | null>(null);

  const uniqueSubjects = Array.from(new Set(decks.map((deck) => formatSubject(deck.subject)))).sort();
  const dynamicFilters = ['All', ...uniqueSubjects];

  const query = search.trim().toLowerCase();
  const filtered = decks.filter((deck) => {
    const matchFilter =
      activeFilter === 'All' || deck.subject.toLowerCase() === activeFilter.toLowerCase();
    const matchSearch =
      !query ||
      deck.name.toLowerCase().includes(query) ||
      deck.subject.toLowerCase().includes(query) ||
      (deck.description?.toLowerCase().includes(query) ?? false);
    return matchFilter && matchSearch;
  });

  const hasFilters = activeFilter !== 'All' || query.length > 0;

  const dialogs = (
    <>
      <CreateDeckDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editDeck && (
        <EditDeckDialog
          open={!!editDeck}
          onOpenChange={(open) => {
            if (!open) setEditDeck(null);
          }}
          initialValues={editDeck}
        />
      )}

      {deleteDeck && (
        <DeleteDeckDialog
          open={!!deleteDeck}
          onOpenChange={(open) => {
            if (!open) setDeleteDeck(null);
          }}
          deck={deleteDeck}
        />
      )}
    </>
  );

  // No decks at all — the celebrated empty state replaces the whole grid.
  if (decks.length === 0) {
    return (
      <>
        <PageSection>
          <EmptyDeckCard onClick={() => setCreateOpen(true)} />
        </PageSection>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <PageSection className="mb-8 flex flex-col flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-2 sm:flex-row">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {dynamicFilters.map((filter) => (
            <Button
              key={filter}
              type="button"
              variant={activeFilter === filter ? 'default' : 'ghost'}
              onClick={() => setActiveFilter(filter)}
              className="px-4 py-1.5 text-xs sm:px-5 sm:text-sm"
            >
              {filter}
            </Button>
          ))}
        </div>

        <div className="flex w-full items-center rounded-lg bg-card transition-all focus-within:ring-2 focus-within:ring-primary/20 sm:ml-auto sm:w-48 md:w-64">
          <Search className="ml-3 h-4 w-4 text-outline" />
          <Input
            type="text"
            placeholder="Filter decks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="w-full whitespace-nowrap sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" />
          New deck
        </Button>
      </PageSection>

      {filtered.length === 0 ? (
        <PageSection className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-headline-md text-on-surface">
            {query ? `No decks match “${search.trim()}”` : 'No decks in this subject'}
          </p>
          <p className="text-body-md text-on-surface-variant">
            Try a different subject, or clear the filters to see everything.
          </p>
          {hasFilters && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActiveFilter('All');
                setSearch('');
              }}
            >
              Clear filters
            </Button>
          )}
        </PageSection>
      ) : (
        <PageSection className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              {...deck}
              onEdit={() => setEditDeck(deck)}
              onDelete={() => setDeleteDeck(deck)}
            />
          ))}
        </PageSection>
      )}

      {dialogs}
    </>
  );
}
