import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listSkills } from "@/lib/services/skill-service"
import { SkillsManager } from "@/components/settings/skills-manager"

export const metadata: Metadata = {
  title: "Configuración",
  description: "Manage your skills and NeuroCards settings",
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const skills = await listSkills(session.user.id)

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Manage the skills the AI examiner draws on during &ldquo;Quiz me with AI&rdquo; sessions.
        </p>
      </div>

      <SkillsManager initialSkills={skills} />
    </div>
  )
}
