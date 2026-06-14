'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CardEditorFormSchema,
  type CardData,
  type CardEditorFormValues,
  CreateCardSchema,
  UpdateCardSchema,
} from '@/lib/validations';
import { createCardAction, updateCardAction } from '@/app/actions/cards';

const IMAGE_SLOTS: ReadonlyArray<1 | 2> = [1, 2];

interface CardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  initialValues?: CardData;
}

export function CardEditor({
  open,
  onOpenChange,
  deckId,
  initialValues,
}: CardEditorProps): React.JSX.Element {
  const router = useRouter();
  const isEdit = Boolean(initialValues);
  const editingCardId = initialValues?.id ?? '';

  const [image1, setImage1] = useState<string | null>(initialValues?.image_url_1 ?? null);
  const [image2, setImage2] = useState<string | null>(initialValues?.image_url_2 ?? null);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const file1Ref = useRef<HTMLInputElement>(null);
  const file2Ref = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CardEditorFormValues>({
    resolver: zodResolver(CardEditorFormSchema),
    defaultValues: {
      front: initialValues?.front ?? '',
      back: initialValues?.back ?? '',
      tags: (initialValues?.tags ?? []).join(', '),
    },
  });

  useEffect(() => {
    reset({
      front: initialValues?.front ?? '',
      back: initialValues?.back ?? '',
      tags: (initialValues?.tags ?? []).join(', '),
    });
    setImage1(initialValues?.image_url_1 ?? null);
    setImage2(initialValues?.image_url_2 ?? null);
    setSubmitError(null);
  }, [initialValues, reset]);

  const uploadImage = async (file: File, slot: 1 | 2): Promise<void> => {
    setSubmitError(null);

    const setImage = slot === 1 ? setImage1 : setImage2;
    const setUploading = slot === 1 ? setUploading1 : setUploading2;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof json === 'object' &&
            json !== null &&
            'error' in json &&
            typeof json.error === 'object' &&
            json.error !== null &&
            'message' in json.error &&
            typeof json.error.message === 'string'
            ? json.error.message
            : 'Upload failed';
        throw new Error(message);
      }

      const url =
        typeof json === 'object' &&
          json !== null &&
          'data' in json &&
          typeof json.data === 'object' &&
          json.data !== null &&
          'url' in json.data &&
          typeof json.data.url === 'string'
          ? json.data.url
          : null;

      if (!url) {
        throw new Error('Upload failed');
      }

      setImage(url);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: CardEditorFormValues): Promise<void> => {
    setSubmitError(null);

    const tags = data.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const parsed = isEdit
      ? UpdateCardSchema.safeParse({
        front: data.front,
        back: data.back,
        tags,
        image_url_1: image1,
        image_url_2: image2,
      })
      : CreateCardSchema.safeParse({
        deck_id: deckId,
        front: data.front,
        back: data.back,
        tags,
        image_url_1: image1 ?? undefined,
        image_url_2: image2 ?? undefined,
      });

    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Invalid card data');
      return;
    }

    const result = isEdit
      ? await updateCardAction(editingCardId, parsed.data)
      : await createCardAction(parsed.data);

    if (result.error) {
      setSubmitError(result.error.message);
      return;
    }

    reset({
      front: '',
      back: '',
      tags: '',
    });
    setImage1(null);
    setImage2(null);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogTitle>{isEdit ? 'Edit card' : 'New card'}</DialogTitle>

          {submitError && <p className="mb-4 text-sm text-destructive">{submitError}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="card-front">Question (front)</Label>
              <Textarea
                id="card-front"
                rows={3}
                placeholder="What is the question?"
                aria-invalid={Boolean(errors.front)}
                {...register('front')}
              />
              {errors.front && <p className="text-sm text-destructive">{errors.front.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="card-back">Answer (back)</Label>
              <Textarea
                id="card-back"
                rows={3}
                placeholder="What is the answer?"
                aria-invalid={Boolean(errors.back)}
                {...register('back')}
              />
              {errors.back && <p className="text-sm text-destructive">{errors.back.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="card-tags">Tags</Label>
              <Input
                id="card-tags"
                type="text"
                placeholder="e.g. neuron, synapse, membrane"
                {...register('tags')}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {IMAGE_SLOTS.map((slot) => {
                const image = slot === 1 ? image1 : image2;
                const isUploading = slot === 1 ? uploading1 : uploading2;
                const fileRef = slot === 1 ? file1Ref : file2Ref;
                const clearImage = slot === 1 ? setImage1 : setImage2;

                return (
                  <div key={slot} className="flex flex-col gap-2">
                    <Label>Image {slot}</Label>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-28 w-full border-dashed p-0"
                        onClick={() => fileRef.current?.click()}
                      >
                        {isUploading ? (
                          <span className="text-sm text-muted-foreground">Uploading…</span>
                        ) : image ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image}
                              alt={`Card image ${slot}`}
                              className="h-full w-full rounded-lg object-cover"
                            />
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Upload image</span>
                        )}
                      </Button>
                      {image && !isUploading && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          className="absolute top-2 right-2"
                          onClick={() => clearImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadImage(file, slot);
                        }
                        event.target.value = '';
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose className="px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || uploading1 || uploading2}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add card'}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
