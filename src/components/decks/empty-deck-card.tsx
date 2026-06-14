'use client';

import { Button } from '@/components/ui/button';
import { FolderPlus, Plus } from 'lucide-react';

interface EmptyDeckCardProps {
  onClick: () => void;
}

export function EmptyDeckCard({ onClick }: EmptyDeckCardProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-outline-variant bg-surface-container-low/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px] hover:bg-surface-container-low transition-all group cursor-pointer"
    >
      <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <FolderPlus className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">Create your first deck</h3>
      <p className="text-sm text-on-surface-variant max-w-[200px] mb-6">
        Start your learning journey by building a customized intellectual stack.
      </p>
      <Button type="button" variant="ghost" className="text-primary">
        <Plus className="h-4 w-4 mr-1" />
        Get started
      </Button>
    </div>
  );
}
