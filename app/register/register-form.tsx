"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  AuthCard,
  AuthDivider,
  authAlertClass,
  authFieldClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth-card"
import { PasswordField } from "@/components/password-field"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { isPasswordValid } from "@/lib/password-policy"

type RegisterFormProps = {
  githubEnabled: boolean
}

export function RegisterForm({ githubEnabled }: RegisterFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordAttempted, setPasswordAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!isPasswordValid(password)) {
      setPasswordAttempted(true)
      return
    }
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
    <AuthCard>
      <CardHeader className="gap-2 pt-1">
        <CardDescription className="text-sm leading-relaxed">
          {githubEnabled
            ? "填写以下信息即可完成注册；也可在下方使用 GitHub。"
            : "填写以下信息即可完成注册。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">昵称</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              className={authFieldClass}
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
              className={authFieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">密码</Label>
            <PasswordField
              id="password"
              value={password}
              attempted={passwordAttempted}
              onChange={setPassword}
              onInvalidAttempt={() => setPasswordAttempted(true)}
            />
          </div>
          {error ? (
            <p role="alert" className={authAlertClass}>
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className={authPrimaryButtonClass}>
            {pending ? "注册中…" : "注册"}
          </Button>
        </form>

        {githubEnabled ? (
          <>
            <AuthDivider />
            <Button
              type="button"
              variant="outline"
              className={authSecondaryButtonClass}
              onClick={() => void onGitHub()}
            >
              使用 GitHub 注册/登录
            </Button>
          </>
        ) : null}

        <p className="text-muted-foreground border-border/60 border-t pt-4 text-center text-sm">
          已有账号？{" "}
          <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
            登录
          </Link>
        </p>
      </CardContent>
    </AuthCard>
  )
}
