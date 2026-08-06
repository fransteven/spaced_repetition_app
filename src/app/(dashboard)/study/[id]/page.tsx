import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getStudySession } from "@/lib/services/study-service"
import { ServiceError } from "@/lib/services/service-error"
import { StudySession } from "@/components/study/study-session"
import { StudyOutcome } from "@/components/study/study-outcome"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth()
  if (!session?.user?.id) return { title: "Study — NeuroCards" }

  const { id } = await params
  try {
    const data = await getStudySession(session.user.id, id)
    return {
      title: `Studying: ${data.deckName} — NeuroCards`,
      description: `Spaced repetition session for ${data.deckName}`,
    }
  } catch {
    return { title: "Study — NeuroCards" }
  }
}

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
    return <StudyOutcome variant="caught-up" deckId={id} />
  }

  return <StudySession deckId={id} deckName={data.deckName} initialCards={data.cards} />
}
