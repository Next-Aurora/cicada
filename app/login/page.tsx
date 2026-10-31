import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginForm } from "@/app/login/login-form"
import { AuthPageShell } from "@/components/auth-page-shell"
import { isGitHubAuthEnabled, isWeChatMiniAuthEnabled } from "@/lib/auth-flags"
import { getLocale } from "@/lib/i18n/get-locale"
import { messages } from "@/lib/i18n/messages"

export async function generateMetadata(): Promise<Metadata> {
  const m = messages[await getLocale()].auth
  return {
    title: m.loginTitle,
    description: m.loginMeta,
  }
}

export default async function LoginPage() {
  const githubEnabled = isGitHubAuthEnabled()
  const wechatMiniEnabled = isWeChatMiniAuthEnabled()
  const m = messages[await getLocale()].auth

  return (
    <AuthPageShell title={m.loginTitle} description={m.loginDescription}>
      <Suspense fallback={<div className="text-muted-foreground text-center text-sm">{m.loading}</div>}>
        <LoginForm githubEnabled={githubEnabled} wechatMiniEnabled={wechatMiniEnabled} />
      </Suspense>
    </AuthPageShell>
  )
}
