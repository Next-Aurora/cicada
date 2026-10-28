import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginForm } from "@/app/login/login-form"
import { AuthPageShell } from "@/components/auth-page-shell"
import { isGitHubAuthEnabled, isWeChatMiniAuthEnabled } from "@/lib/auth-flags"

export const metadata: Metadata = {
  title: "登录",
  description: "登录凌风蝉（cicadar）账号。",
}

export default function LoginPage() {
  const githubEnabled = isGitHubAuthEnabled()
  const wechatMiniEnabled = isWeChatMiniAuthEnabled()

  return (
    <AuthPageShell title="登录" description="继续你的旅行攻略、记录与小工具。">
      <Suspense fallback={<div className="text-muted-foreground text-center text-sm">加载中…</div>}>
        <LoginForm githubEnabled={githubEnabled} wechatMiniEnabled={wechatMiniEnabled} />
      </Suspense>
    </AuthPageShell>
  )
}
