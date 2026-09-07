"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchField } from "@/components/primitives/search-field"
import { NoResults } from "@/components/primitives/no-results"
import { useListSearch } from "@/hooks/use-list-search"
import { CreateSkillSchema } from "@/lib/validations"
import type { z } from "zod"
import type { SkillItem } from "@/lib/services/skill-service"

type SkillFormValues = z.infer<typeof CreateSkillSchema>

const SKILL_REPOS: { name: string; url: string; description: string }[] = [
  {
    name: "Anthropic Agent Skills",
    url: "https://github.com/anthropics/skills",
    description: "Official catalog of reusable agent skills.",
  },
  {
    name: "Anthropic Cookbook",
    url: "https://github.com/anthropics/anthropic-cookbook",
    description: "Prompting and tutoring patterns you can adapt into a rubric.",
  },
  {
    name: "Awesome ChatGPT Prompts",
    url: "https://github.com/f/awesome-chatgpt-prompts",
    description: "Large community-curated prompt collection.",
  },
  {
    name: "Awesome Prompt Engineering",
    url: "https://github.com/promptslab/Awesome-Prompt-Engineering",
    description: "Curated prompt-engineering resources and papers.",
  },
  {
    name: "LangChain Hub",
    url: "https://smith.langchain.com/hub",
    description: "Searchable hub of shared prompts.",
  },
]

interface Props {
  initialSkills: SkillItem[]
}

export function SkillsManager({ initialSkills }: Props): React.JSX.Element {
  const [skills, setSkills] = useState<SkillItem[]>(initialSkills)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getSkillHaystack = useCallback(
    (skill: SkillItem): Array<string | null | undefined> => [skill.name, skill.topic],
    []
  )

  const {
    query,
    setQuery,
    results: filteredSkills,
    isSearching,
    clear,
  } = useListSearch(skills, getSkillHaystack)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(CreateSkillSchema),
    defaultValues: { name: "", topic: "", rubric: "" },
  })

  const onSubmit = async (data: SkillFormValues) => {
    setSubmitError(null)
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Failed to create skill.")
        return
      }
      setSkills((prev) => [...prev, { ...json.data, isCustom: true }])
      reset()
    } catch (err) {
      console.error('[SkillsManager create]', err)
      setSubmitError("An unexpected error occurred.")
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (err) {
      console.error('[SkillsManager delete]', err)
    } finally {
      setDeletingId(null)
    }
  }

  const predefined = filteredSkills.filter((s) => !s.isCustom)
  const custom = filteredSkills.filter((s) => s.isCustom)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface">Skills</h2>
          <p className="text-sm text-on-surface-variant">Browse and manage AI examiner skills</p>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Filter skills…"
          className="w-full sm:w-64"
        />
      </div>

      {isSearching && filteredSkills.length === 0 ? (
        <NoResults query={query} onClear={clear} />
      ) : (
        <>
          {/* Predefined skills */}
          {predefined.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-on-surface">Built-in skills</h2>
              <div className="flex flex-col gap-2">
                {predefined.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-surface-container-low rounded-lg px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-on-surface">{skill.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{skill.topic}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Custom skills */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-on-surface">Your custom skills</h2>
            {custom.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                {isSearching
                  ? "No custom skills match this filter."
                  : "No custom skills yet — add one below to focus exams on a topic you care about."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {custom.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{skill.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{skill.topic}</p>
                      <p className="text-xs text-on-surface-variant/70 mt-1">{skill.rubric}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      disabled={deletingId === skill.id}
                      aria-label={`Delete ${skill.name}`}
                      className="text-on-surface-variant hover:text-error transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Add custom skill form */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-on-surface">Add a custom skill</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
          {submitError && <p className="text-sm text-error">{submitError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g. Organic chemistry"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-error">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="skill-topic">Topic</Label>
            <Input
              id="skill-topic"
              placeholder="e.g. Reaction mechanisms"
              aria-invalid={Boolean(errors.topic)}
              {...register("topic")}
            />
            {errors.topic && <p className="text-sm text-error">{errors.topic.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="skill-rubric">Rubric (instructions for the tutor)</Label>
            <Textarea
              id="skill-rubric"
              rows={3}
              placeholder="e.g. Ask the student to predict the product of a reaction shown on the card and explain the mechanism."
              aria-invalid={Boolean(errors.rubric)}
              {...register("rubric")}
            />
            {errors.rubric && <p className="text-sm text-error">{errors.rubric.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="self-start">
            <Sparkles className="h-4 w-4" />
            {isSubmitting ? "Adding…" : "Add skill"}
          </Button>
        </form>
      </section>

      {/* Skill repository links */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-on-surface">Find more skills</h2>
        <p className="text-sm text-on-surface-variant">
          Browse these community collections for rubric ideas, then paste one in above.
        </p>
        <div className="flex flex-col gap-2">
          {SKILL_REPOS.map((repo) => (
            <a
              key={repo.url}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg px-4 py-3 hover:bg-surface-bright transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">{repo.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{repo.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-on-surface-variant shrink-0" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
