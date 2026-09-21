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
import { SectionHeading } from "@/components/primitives/section-heading"
import { Surface } from "@/components/primitives/surface"
import { Pill } from "@/components/primitives/pill"
import { useListSearch } from "@/hooks/use-list-search"
import { CreateSkillSchema } from "@/lib/validations"
import type { z } from "zod"
import type { SkillItem } from "@/lib/services/skill-service"
import { toast } from "sonner"

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
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to create skill.")
        return
      }
      setSkills((prev) => [...prev, { ...json.data, isCustom: true }])
      toast.success("Skill created successfully!")
      reset()
    } catch (err) {
      console.error("[SkillsManager create]", err)
      toast.error("An unexpected error occurred.")
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id))
        toast.success(`Skill "${name}" deleted`)
      } else {
        toast.error("Failed to delete skill")
      }
    } catch (err) {
      console.error("[SkillsManager delete]", err)
      toast.error("Failed to delete skill")
    } finally {
      setDeletingId(null)
    }
  }

  const predefined = filteredSkills.filter((s) => !s.isCustom)
  const custom = filteredSkills.filter((s) => s.isCustom)

  return (
    <div className="flex flex-col gap-10">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold tracking-tight text-on-surface">Skills</h2>
          <p className="text-body-sm text-on-surface-variant">Browse and manage AI examiner skills</p>
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
            <section className="flex flex-col gap-4">
              <SectionHeading
                title="Built-in skills"
                description="Core evaluation rubrics included with NeuroCards"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predefined.map((skill) => (
                  <Surface
                    key={skill.id}
                    tone="panel"
                    className="p-4 rounded-xl flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-body-md font-semibold text-on-surface">{skill.name}</p>
                        <Pill tone="neutral" size="sm">Built-in</Pill>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1">{skill.topic}</p>
                    </div>
                  </Surface>
                ))}
              </div>
            </section>
          )}

          {/* Custom skills */}
          <section className="flex flex-col gap-4">
            <SectionHeading
              title="Your custom skills"
              description="Personalized rubrics for specialized subjects"
            />
            {custom.length === 0 ? (
              <Surface tone="panel" className="p-6 rounded-xl text-center">
                <p className="text-body-sm text-on-surface-variant">
                  {isSearching
                    ? "No custom skills match this filter."
                    : "No custom skills yet — create one below to guide AI examination on specific topics."}
                </p>
              </Surface>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {custom.map((skill) => (
                  <Surface
                    key={skill.id}
                    tone="card"
                    className="p-4 sm:p-5 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-body-md font-semibold text-on-surface">{skill.name}</p>
                        <Pill tone="mastered" size="sm">Custom</Pill>
                      </div>
                      <p className="text-body-sm text-on-surface-variant">{skill.topic}</p>
                      {skill.rubric && (
                        <p className="text-label-md text-on-surface-variant/80 pt-1 leading-relaxed">
                          {skill.rubric}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(skill.id, skill.name)}
                      disabled={deletingId === skill.id}
                      aria-label={`Delete ${skill.name}`}
                      className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-container-high cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Surface>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Add custom skill form */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          title="Add a custom skill"
          description="Create a rubric to guide the AI examiner's questions and feedback"
        />
        <Surface tone="card" className="p-5 sm:p-6 rounded-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="skill-name" className="text-label-md text-on-surface-variant">
                  Skill Name
                </Label>
                <Input
                  id="skill-name"
                  placeholder="e.g. Organic Chemistry"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                  className="h-10 text-body-md"
                />
                {errors.name && <p className="text-label-sm text-error">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skill-topic" className="text-label-md text-on-surface-variant">
                  Topic
                </Label>
                <Input
                  id="skill-topic"
                  placeholder="e.g. Reaction Mechanisms"
                  aria-invalid={Boolean(errors.topic)}
                  {...register("topic")}
                  className="h-10 text-body-md"
                />
                {errors.topic && <p className="text-label-sm text-error">{errors.topic.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skill-rubric" className="text-label-md text-on-surface-variant">
                Rubric (instructions for the AI tutor)
              </Label>
              <Textarea
                id="skill-rubric"
                rows={3}
                placeholder="e.g. Ask the student to predict the product of a reaction and explain the transition state."
                aria-invalid={Boolean(errors.rubric)}
                {...register("rubric")}
                className="text-body-md"
              />
              {errors.rubric && <p className="text-label-sm text-error">{errors.rubric.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="self-start gap-2 mt-2">
              <Sparkles className="size-4" />
              {isSubmitting ? "Adding…" : "Add skill"}
            </Button>
          </form>
        </Surface>
      </section>

      {/* Skill repository links */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          title="Find more skills"
          description="Browse community collections for rubric ideas to adapt"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SKILL_REPOS.map((repo) => (
            <a
              key={repo.url}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl p-4 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div>
                <p className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {repo.name}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">{repo.description}</p>
              </div>
              <ExternalLink className="size-4 text-on-surface-variant shrink-0 group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
