'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

import { CANVAS_FILE_PATTERN, MAX_CANVAS_SIZE_BYTES } from '@/lib/canvases/limits';
import { unwrapError } from '@/lib/api-envelope';
import { Button } from '@/components/ui/button';

const UploadCanvasFormSchema = z.object({
  file: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Choose a file')
    .refine((file) => CANVAS_FILE_PATTERN.test(file.name), 'Only .html files are supported')
    .refine((file) => file.size <= MAX_CANVAS_SIZE_BYTES, 'The file is larger than 2 MB'),
});

type UploadCanvasFormValues = z.infer<typeof UploadCanvasFormSchema>;

const UploadResponseSchema = z.object({ data: z.object({ id: z.string() }) });

export function CanvasUploadButton({ disabled = false }: { disabled?: boolean }): React.JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { handleSubmit, setValue, reset } = useForm<UploadCanvasFormValues>({
    resolver: zodResolver(UploadCanvasFormSchema),
  });

  const clear = (): void => {
    reset();
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = async ({ file }: UploadCanvasFormValues): Promise<void> => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/canvases', { method: 'POST', body });
      const json: unknown = await response.json();
      if (!response.ok) {
        toast.error(unwrapError(json, 'Could not save the canvas'));
        return;
      }
      const saved = UploadResponseSchema.safeParse(json);
      toast.success('Canvas saved');
      if (saved.success) router.push(`/mind-maps/canvases/${saved.data.data.id}`);
      else router.refresh();
    } catch {
      toast.error('Upload failed');
    } finally {
      setBusy(false);
      clear();
    }
  };

  const onInvalid = (errors: Partial<Record<keyof UploadCanvasFormValues, { message?: string }>>): void => {
    toast.error(errors.file?.message ?? 'Invalid file');
    clear();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="canvas-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setValue('file', file);
          void handleSubmit(onSubmit, onInvalid)();
        }}
      />
      <Button
        type="button"
        size="xl"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        title={disabled ? 'Canvas limit reached' : undefined}
      >
        <Upload data-icon="inline-start" />
        {busy ? 'Uploading…' : 'Upload HTML'}
      </Button>
    </form>
  );
}
