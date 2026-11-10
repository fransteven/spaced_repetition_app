'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Surface } from '@/components/primitives/surface';
import { MindMapCanvas } from '@/components/mind-maps/mind-map-canvas';
import { MindMapFormSchema, type MindMapFormValues } from '@/lib/validations';
import { MAX_MIND_MAP_NODES, countMindMapNodes, parseMindMapMarkdown } from '@/lib/mind-maps/parse-markdown';
import { createMindMapAction, updateMindMapAction } from '@/app/actions/mind-map-actions';

const MAX_IMPORT_BYTES = 500 * 1024;

export const MIND_MAP_STARTER = `# Photosynthesis
## Inputs
- Sunlight
- Water
  - Absorbed by roots
- Carbon dioxide
## Stages
### Light reactions
- Thylakoid membranes
- Produce ATP and NADPH
### Calvin cycle
- Stroma
- Fixes CO2 into sugar
## Outputs
- Glucose
- Oxygen
`;

interface MindMapEditorProps {
  mindMapId?: string;
  defaultValues: MindMapFormValues;
}

export function MindMapEditor({ mindMapId, defaultValues }: MindMapEditorProps): React.JSX.Element {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<MindMapFormValues>({ resolver: zodResolver(MindMapFormSchema), defaultValues });

  const title = useWatch({ control, name: 'title' });
  const markdown = useWatch({ control, name: 'markdown' });
  const deferredMarkdown = useDeferredValue(markdown);
  const deferredTitle = useDeferredValue(title);
  const tree = useMemo(() => parseMindMapMarkdown(deferredMarkdown ?? '', deferredTitle), [deferredMarkdown, deferredTitle]);
  const nodeCount = countMindMapNodes(tree);
  const tooBig = nodeCount > MAX_MIND_MAP_NODES;
  // Re-frame the preview when branches are added or removed, not on every keystroke.
  const fitKey = `${tree.children.length}:${Math.round(nodeCount / 5)}`;

  const onSubmit = async (values: MindMapFormValues): Promise<void> => {
    setSaving(true);
    const result = mindMapId ? await updateMindMapAction(mindMapId, values) : await createMindMapAction(values);
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? 'Could not save the mind map');
      setSaving(false);
      return;
    }
    toast.success(mindMapId ? 'Mind map updated' : 'Mind map saved');
    router.push(`/mind-maps/${result.data.id}`);
    router.refresh();
  };

  const importFile = async (file: File): Promise<void> => {
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('That file is too large (500 KB max)');
      return;
    }
    const content = await file.text();
    setValue('markdown', content, { shouldValidate: true, shouldDirty: true });
    if (!title) setValue('title', file.name.replace(/\.(md|markdown|txt)$/i, ''), { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:gap-6 lg:grid-cols-5">
      <Surface tone="card" className="flex flex-col gap-5 p-5 sm:p-6 lg:col-span-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mind-map-title">Title</Label>
          <Input
            id="mind-map-title"
            placeholder="Defaults to the # heading"
            aria-invalid={Boolean(errors.title)}
            {...register('title')}
          />
          {errors.title && <p className="text-body-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mind-map-markdown">Outline (Markdown)</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importFile(file);
              }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp data-icon="inline-start" />
              Import .md
            </Button>
          </div>
          <Textarea
            id="mind-map-markdown"
            rows={18}
            spellCheck={false}
            aria-invalid={Boolean(errors.markdown) || tooBig}
            aria-describedby="mind-map-format"
            className="min-h-72 flex-1 font-mono text-body-sm"
            {...register('markdown')}
          />
          {errors.markdown && <p className="text-body-sm text-destructive">{errors.markdown.message}</p>}
          <p id="mind-map-format" className="text-body-sm text-on-surface-variant">
            <code># Topic</code> is the centre, <code>##</code> and <code>###</code> are branches, and indented{' '}
            <code>- bullets</code> are details. Text outside lists becomes a leaf.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn('text-body-sm tabular', tooBig ? 'text-destructive' : 'text-on-surface-variant')}>
            {nodeCount} / {MAX_MIND_MAP_NODES} nodes
          </span>
          <div className="flex items-center gap-2">
            <Link href={mindMapId ? `/mind-maps/${mindMapId}` : '/mind-maps'} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              Cancel
            </Link>
            <Button type="submit" size="lg" disabled={saving || tooBig}>
              {saving ? 'Saving…' : mindMapId ? 'Save changes' : 'Save mind map'}
            </Button>
          </div>
        </div>
      </Surface>

      <section aria-label="Preview" className="lg:col-span-3">
        <MindMapCanvas root={tree} fitKey={fitKey} className="h-96 sm:h-[32rem] lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]" />
      </section>
    </form>
  );
}
