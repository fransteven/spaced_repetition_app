'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeckCard, type DeckWithStats } from '@/components/decks/DeckCard';
import { EmptyDeckCard } from '@/components/decks/empty-deck-card';
import { CreateDeckDialog } from '@/components/decks/CreateDeckDialog';
import { EditDeckDialog } from '@/components/decks/EditDeckDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeckListProps {
  decks: DeckWithStats[];
}

export function DeckList({ decks }: DeckListProps): React.JSX.Element {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [search,       setSearch]       = useState('');
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [editDeck,     setEditDeck]     = useState<DeckWithStats | null>(null);

  const uniqueSubjects = Array.from(
    new Set(decks.map((deck) => {
      // Capitalize the first letter of each subject
      const subject = deck.subject;
      return subject.charAt(0).toUpperCase() + subject.slice(1);
    }))
  ).sort();

  const dynamicFilters = ['All', ...uniqueSubjects];

  const filtered = decks.filter((d) => {
    const matchFilter = activeFilter === 'All' || d.subject.toLowerCase() === activeFilter.toLowerCase();
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleDelete = async (id: string) => {
    await fetch(`/api/decks/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <>
      <section className="max-w-7xl mx-auto mb-8 bg-surface-container-low p-2 rounded-xl flex flex-wrap items-center gap-2">
        {dynamicFilters.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={activeFilter === filter ? 'default' : 'ghost'}
            onClick={() => setActiveFilter(filter)}
            className="px-5"
          >
            {filter}
          </Button>
        ))}

        <div className="ml-auto hidden sm:flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <span className="material-symbols-outlined pl-3 text-outline text-lg">search</span>
          <Input
            type="text"
            placeholder="Filter by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Deck
        </Button>
      </section>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((deck) => (
          <DeckCard
            key={deck.id}
            {...deck}
            menuOpen={openMenuId === deck.id}
            onMenuToggle={() => setOpenMenuId(openMenuId === deck.id ? null : deck.id)}
            onMenuClose={() => setOpenMenuId(null)}
            onEdit={() => setEditDeck(deck)}
            onDelete={() => handleDelete(deck.id)}
          />
        ))}
        <EmptyDeckCard onClick={() => setCreateOpen(true)} />
      </div>

      <CreateDeckDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editDeck && (
        <EditDeckDialog
          open={!!editDeck}
          onOpenChange={(open) => { if (!open) setEditDeck(null); }}
          initialValues={editDeck}
        />
      )}
    </>
  );
}
