import Link from "next/link"
import { Suspense } from "react"

import { LoginForm } from "@/app/login/login-form"
import { isGitHubAuthEnabled, isWeChatMiniAuthEnabled } from "@/lib/auth-flags"

export default function LoginPage() {
  const githubEnabled = isGitHubAuthEnabled()
  const wechatMiniEnabled = isWeChatMiniAuthEnabled()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
      <Suspense fallback={<div className="text-muted-foreground text-sm">加载中…</div>}>
        <LoginForm githubEnabled={githubEnabled} wechatMiniEnabled={wechatMiniEnabled} />
      </Suspense>
      <Link href="/" className="text-muted-foreground mt-6 text-sm hover:underline">
        ← 返回首页
      </Link>
    </main>
  )
}
