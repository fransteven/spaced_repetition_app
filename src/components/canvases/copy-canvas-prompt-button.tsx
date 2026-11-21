'use client';

import { ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

import { CANVAS_PROMPT } from '@/lib/canvases/prompt';
import { Button } from '@/components/ui/button';

/** Copies instructions that make any LLM return a canvas that works inside the sandbox. */
export function CopyCanvasPromptButton(): React.JSX.Element {
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(CANVAS_PROMPT);
      toast.success('Prompt copied. Paste it into your AI assistant and add your idea.');
    } catch {
      toast.error('Could not copy to the clipboard');
    }
  };

  return (
    <Button type="button" variant="ghost" size="xl" onClick={() => void copy()}>
      <ClipboardCopy data-icon="inline-start" />
      Copy prompt
    </Button>
  );
}
