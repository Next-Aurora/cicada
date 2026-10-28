import type { Metadata } from "next"

import { RegisterForm } from "@/app/register/register-form"
import { AuthPageShell } from "@/components/auth-page-shell"
import { isGitHubAuthEnabled } from "@/lib/auth-flags"

export const metadata: Metadata = {
  title: "注册",
  description: "注册凌风蝉（cicadar）账号。",
}

export default function RegisterPage() {
  const githubEnabled = isGitHubAuthEnabled()

  return (
    <AuthPageShell title="注册" description="创建账号，后续可用于评论与收藏。">
      <RegisterForm githubEnabled={githubEnabled} />
    </AuthPageShell>
  )
}
