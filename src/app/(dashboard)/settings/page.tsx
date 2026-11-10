import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { listSkills } from "@/lib/services/skill-service"
import { SkillsManager } from "@/components/settings/skills-manager"
import { AiAssistantsManager } from "@/components/settings/ai-assistants-manager"
import { listApiTokens } from "@/lib/services/api-token-service"
import { PageHeader, PageSection } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "Settings — NeuroCards",
  description: "Manage AI examiner skills and connect AI assistants",
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [skills, tokens] = await Promise.all([listSkills(session.user.id), listApiTokens(session.user.id)])
  const mcpUrl = `${await appOrigin()}/api/mcp`

  return (
    <>
      <PageHeader>
        <h1 className="mb-2 text-display-sm sm:text-display-md text-on-surface">Settings</h1>
        <p className="max-w-lg text-body-lg text-on-surface-variant">
          Manage the skills the AI examiner draws on and connect Claude or ChatGPT.
        </p>
      </PageHeader>

      <PageSection>
        <div className="max-w-4xl space-y-10 sm:space-y-12">
          <SkillsManager initialSkills={skills} />
          <AiAssistantsManager initialTokens={tokens} mcpUrl={mcpUrl} />
        </div>
      </PageSection>
    </>
  )
}

/** Public origin for the MCP URL shown to the user (configured URL first, then the request host). */
async function appOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  if (configured) return configured.replace(/\/+$/, "")
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000"
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
