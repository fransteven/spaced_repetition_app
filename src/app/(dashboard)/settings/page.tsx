import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listSkills } from "@/lib/services/skill-service"
import { SkillsManager } from "@/components/settings/skills-manager"
import { PageHeader, PageSection } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Settings — NeuroCards",
  description: "Manage AI examiner skills and study preferences",
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const skills = await listSkills(session.user.id)

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-lg text-on-surface">Settings</h1>
        <p className="max-w-lg text-body-lg text-on-surface-variant">
          Manage the skills the AI examiner draws on during study sessions.
        </p>
      </PageHeader>

      <PageSection>
        <div className="max-w-4xl">
          <SkillsManager initialSkills={skills} />
        </div>
      </PageSection>
    </>
  )
}
