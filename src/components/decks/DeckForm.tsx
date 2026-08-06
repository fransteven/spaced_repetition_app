'use client';

import { useEffect, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateDeckSchema } from '@/lib/validations';

/**
 * Shared field set for the create and edit deck dialogs. Both used to hand-roll
 * the same three fields, and only Create offered the existing-subject picker —
 * so editing a deck could silently invent a typo'd subject.
 */
export type DeckFormValues = z.infer<typeof CreateDeckSchema>;

interface DeckFormProps {
  form: UseFormReturn<DeckFormValues>;
  /** Prefixes the input ids so two dialogs can coexist in the DOM. */
  idPrefix: string;
  /** Refetch the subject list whenever the hosting dialog opens. */
  open: boolean;
}

export function DeckForm({ form, idPrefix, open }: DeckFormProps): React.JSX.Element {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [isCustomSubject, setIsCustomSubject] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetch('/api/decks');
        if (!response.ok) return;
        const json: unknown = await response.json();
        const decksData = (json as { data?: { subject?: unknown }[] }).data ?? [];
        const subjects = Array.from(
          new Set(
            decksData
              .map((d) => d.subject)
              .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
          )
        );
        if (cancelled) return;
        setExistingSubjects(subjects);
        // Only steer the field when it is still empty — editing a deck must
        // keep the subject it already has.
        if (subjects.length > 0) {
          const current = form.getValues('subject');
          setIsCustomSubject(current !== '' && !subjects.includes(current));
          if (!current) setValue('subject', subjects[0]);
        } else {
          setIsCustomSubject(true);
        }
      } catch (error) {
        console.error('[DeckForm] failed to load subjects', error);
      } finally {
        if (!cancelled) setIsLoadingSubjects(false);
      }
    };

    void fetchSubjects();
    return () => {
      cancelled = true;
    };
  }, [open, form, setValue]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g. Neuroanatomy Basics"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && <p className="text-body-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          placeholder="What will you study?"
          aria-invalid={Boolean(errors.description)}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-body-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-subject`}>Subject</Label>
          {existingSubjects.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const nextIsCustom = !isCustomSubject;
                setIsCustomSubject(nextIsCustom);
                setValue('subject', nextIsCustom ? '' : existingSubjects[0]);
              }}
              className="cursor-pointer text-body-sm text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              {isCustomSubject ? 'Choose existing' : 'Create new'}
            </button>
          )}
        </div>

        {isLoadingSubjects ? (
          <Skeleton className="h-10 w-full rounded-lg" />
        ) : existingSubjects.length > 0 && !isCustomSubject ? (
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => {
                  if (val === '__new__') {
                    setIsCustomSubject(true);
                    field.onChange('');
                  } else {
                    field.onChange(val);
                  }
                }}
              >
                <SelectTrigger
                  id={`${idPrefix}-subject`}
                  className="w-full"
                  aria-invalid={Boolean(errors.subject)}
                >
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {existingSubjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__new__" className="font-medium text-primary">
                    + Create custom subject…
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <Input
            id={`${idPrefix}-subject`}
            placeholder="e.g. Science, Languages, etc."
            aria-invalid={Boolean(errors.subject)}
            {...register('subject')}
          />
        )}
        {errors.subject && <p className="text-body-sm text-destructive">{errors.subject.message}</p>}
      </div>
    </>
  );
}
