'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

import { buildBookPathname, EPUB_CONTENT_TYPE, MAX_BOOK_SIZE_BYTES } from '@/lib/books/limits';
import { unwrapError } from '@/lib/api-envelope';
import { Button } from '@/components/ui/button';

const UploadBookFormSchema = z.object({
  file: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Choose a file')
    .refine((file) => /\.epub$/i.test(file.name), 'Only .epub files are supported')
    .refine((file) => file.size <= MAX_BOOK_SIZE_BYTES, 'The file is larger than 100 MB'),
});

type UploadBookFormValues = z.infer<typeof UploadBookFormSchema>;

interface UploadBookButtonProps {
  userId: string;
  disabled?: boolean;
}

export function UploadBookButton({ userId, disabled = false }: UploadBookButtonProps): React.JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const { handleSubmit, setValue, reset } = useForm<UploadBookFormValues>({
    resolver: zodResolver(UploadBookFormSchema),
  });

  const onSubmit = async ({ file }: UploadBookFormValues): Promise<void> => {
    setProgress(0);
    try {
      const pathname = buildBookPathname(userId, crypto.randomUUID());
      await upload(pathname, file, {
        access: 'private',
        contentType: EPUB_CONTENT_TYPE,
        handleUploadUrl: '/api/books/upload',
        multipart: file.size > 10 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname, filename: file.name }),
      });
      if (!response.ok) {
        toast.error(unwrapError(await response.json(), 'Could not add the book'));
        return;
      }

      toast.success('Book uploaded — preparing it for reading');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setProgress(null);
      reset();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onInvalid = (errors: Partial<Record<keyof UploadBookFormValues, { message?: string }>>): void => {
    toast.error(errors.file?.message ?? 'Invalid file');
    if (inputRef.current) inputRef.current.value = '';
  };

  const busy = progress !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <input
        ref={inputRef}
        type="file"
        accept=".epub,application/epub+zip"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
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
        title={disabled ? 'Library limit reached (50 books)' : undefined}
      >
        <Upload data-icon="inline-start" />
        {busy ? <span className="tabular">Uploading {progress}%</span> : 'Upload EPUB'}
      </Button>
    </form>
  );
}
