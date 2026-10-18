"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

type RegisterFormProps = {
  githubEnabled: boolean
}

export function RegisterForm({ githubEnabled }: RegisterFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/",
    })

    setPending(false)

    if (signUpError) {
      setError(signUpError.message || "注册失败，请稍后重试")
      return
    }

    router.push("/")
    router.refresh()
  }

  async function onGitHub() {
    setError(null)
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>注册</CardTitle>
        <CardDescription>创建账号，后续可用于评论与收藏</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">昵称</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "注册中…" : "注册"}
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
              使用 GitHub 注册/登录
            </Button>
          </>
        ) : null}

        <p className="text-muted-foreground text-center text-sm">
          已有账号？{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            登录
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
