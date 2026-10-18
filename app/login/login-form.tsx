"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { safeCallbackUrl } from "@/lib/safe-callback-url"

type LoginFormProps = {
  githubEnabled: boolean
}

export function LoginForm({ githubEnabled }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    })

    setPending(false)

    if (signInError) {
      setError(signInError.message || "登录失败，请检查邮箱与密码")
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  async function onGitHub() {
    setError(null)
    await authClient.signIn.social({
      provider: "github",
      callbackURL: callbackUrl,
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>
          {githubEnabled ? "使用邮箱密码或 GitHub 登录逆蝉" : "使用邮箱密码登录逆蝉"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "登录中…" : "登录"}
          </Button>
        </form>

        {githubEnabled ? (
          <>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="bg-border h-px flex-1" />
              或
              <span className="bg-border h-px flex-1" />
            </div>
            <Button type="button" variant="outline" onClick={() => void onGitHub()}>
              使用 GitHub 登录
            </Button>
          </>
        ) : null}

        <p className="text-muted-foreground text-center text-sm">
          还没有账号？{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            注册
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
