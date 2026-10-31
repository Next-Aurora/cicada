"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  authAlertClass,
  AuthCard,
  AuthDivider,
  authFieldClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth-card"
import { useI18n } from "@/components/locale-provider"
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
  const { m } = useI18n()
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
      setError(signUpError.message || m.auth.signUpFailed)
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
          {githubEnabled ? m.auth.registerLeadGithub : m.auth.registerLead}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{m.auth.nickname}</Label>
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
            <Label htmlFor="email">{m.auth.email}</Label>
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
            <Label htmlFor="password">{m.auth.password}</Label>
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
            {pending ? m.auth.signingUp : m.auth.signUp}
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
              {m.auth.githubSignUp}
            </Button>
          </>
        ) : null}

        <p className="text-muted-foreground border-border/60 border-t pt-4 text-center text-sm">
          {m.auth.hasAccount}{" "}
          <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
            {m.auth.signIn}
          </Link>
        </p>
      </CardContent>
    </AuthCard>
  )
}
