import Link from "next/link"

import { RegisterForm } from "@/app/register/register-form"
import { isGitHubAuthEnabled } from "@/lib/auth-flags"

export default function RegisterPage() {
  const githubEnabled = isGitHubAuthEnabled()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
      <RegisterForm githubEnabled={githubEnabled} />
      <Link href="/" className="text-muted-foreground mt-6 text-sm hover:underline">
        ← 返回首页
      </Link>
    </main>
  )
}
