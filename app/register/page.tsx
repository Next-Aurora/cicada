import type { Metadata } from "next"

import { RegisterForm } from "@/app/register/register-form"
import { AuthPageShell } from "@/components/auth-page-shell"
import { isGitHubAuthEnabled } from "@/lib/auth-flags"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const m = messages[await getLocale()].auth
  return {
    title: m.registerTitle,
    description: m.registerMeta,
  }
}

export default async function RegisterPage() {
  const githubEnabled = isGitHubAuthEnabled()
  const m = messages[await getLocale()].auth

  return (
    <AuthPageShell title={m.registerTitle} description={m.registerDescription}>
      <RegisterForm githubEnabled={githubEnabled} />
    </AuthPageShell>
  )
}
