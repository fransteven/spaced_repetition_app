import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getStudySession } from "@/lib/services/study-service"
import { ServiceError } from "@/lib/services/service-error"
import { StudySession } from "@/components/study/study-session"

export const metadata: Metadata = {
  title: "Study — NeuroCards",
  description: "Spaced repetition study session",
}

type Props = { params: Promise<{ id: string }> }

export default async function StudyPage({ params }: Props): Promise<React.JSX.Element> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  let data: Awaited<ReturnType<typeof getStudySession>>
  try {
    data = await getStudySession(session.user.id, id)
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") notFound()
      redirect("/decks")
    }
    throw error
  }

  if (data.cards.length === 0) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-tertiary">check_circle</span>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{"You're all caught up"}</h1>
          <p className="text-on-surface-variant text-sm">
            No cards due for review right now. Come back later!
          </p>
        </div>
        <Link
          href={`/decks/${id}`}
          className="px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-container transition-colors"
        >
          Back to deck
        </Link>
      </div>
    )
  }

  return <StudySession deckId={id} deckName={data.deckName} initialCards={data.cards} />
}
