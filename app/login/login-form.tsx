"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import {
  authAlertClass,
  AuthCard,
  AuthDivider,
  authFieldClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth-card"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { safeCallbackUrl } from "@/lib/safe-callback-url"
import { cn } from "@/lib/utils"
import { bindWeChatIdentity, pollWeChatMiniLogin, startWeChatMiniLogin } from "@/lib/wechat-auth-api"
import { isWechatPlaceholderEmail } from "@/lib/wechat-bind"
import { isWeChatInAppBrowser } from "@/lib/wechat-browser"
import {
  isWechatIdentityMethodEnabled,
  WECHAT_IDENTITY_METHODS,
  type WechatIdentityMethod,
} from "@/lib/wechat-identity"

const WECHAT_TICKET_STORAGE_KEY = "cicada:wechat-login-ticket"

type LoginFormProps = {
  githubEnabled: boolean
  wechatMiniEnabled: boolean
}

export function LoginForm({ githubEnabled, wechatMiniEnabled }: LoginFormProps) {
  const router = useRouter()
  const { m } = useI18n()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"))
  const idleLoggedOut = searchParams.get("reason") === "idle"
  const { data: session } = authClient.useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [inWeChat, setInWeChat] = useState(false)
  const [wechatPending, setWechatPending] = useState(false)
  const [requireBindIdentity, setRequireBindIdentity] = useState(false)
  const [bindMethod, setBindMethod] = useState<WechatIdentityMethod>("email")
  const [bindEmail, setBindEmail] = useState("")
  const [bindPassword, setBindPassword] = useState("")
  const [bindPending, setBindPending] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingTicket = useRef<string | null>(null)

  const stopPolling = useEffectEvent(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  })

  const goAfterLogin = useEffectEvent(() => {
    sessionStorage.removeItem(WECHAT_TICKET_STORAGE_KEY)
    stopPolling()
    setWechatPending(false)
    setRequireBindIdentity(false)
    router.push(callbackUrl)
    router.refresh()
  })

  const pollOnce = useEffectEvent(async (ticket: string) => {
    const polled = await pollWeChatMiniLogin(ticket)
    if (!polled.ok) {
      stopPolling()
      setWechatPending(false)
      setError(polled.message)
      return
    }

    if (polled.data.status === "pending") return

    stopPolling()
    setWechatPending(false)
    sessionStorage.removeItem(WECHAT_TICKET_STORAGE_KEY)

    if (polled.data.status === "ok") {
      if (polled.data.requireBindIdentity) {
        setRequireBindIdentity(true)
        setError(null)
        return
      }
      goAfterLogin()
      return
    }

    if (polled.data.status === "expired") {
      setError(m.auth.wechatExpired)
      return
    }

    setError(m.auth.wechatRetry)
  })

  const startPolling = useEffectEvent((ticket: string) => {
    pollingTicket.current = ticket
    sessionStorage.setItem(WECHAT_TICKET_STORAGE_KEY, ticket)
    stopPolling()
    void pollOnce(ticket)
    pollTimer.current = setInterval(() => {
      void pollOnce(ticket)
    }, 1500)
  })

  useEffect(() => {
    setInWeChat(isWeChatInAppBrowser(navigator.userAgent))

    const savedTicket = sessionStorage.getItem(WECHAT_TICKET_STORAGE_KEY)
    if (savedTicket && wechatMiniEnabled) {
      setWechatPending(true)
      startPolling(savedTicket)
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      const ticket = pollingTicket.current || sessionStorage.getItem(WECHAT_TICKET_STORAGE_KEY)
      if (ticket) void pollOnce(ticket)
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pageshow", onVisible)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onVisible)
    }
  }, [wechatMiniEnabled])

  useEffect(() => {
    if (session?.user?.email && isWechatPlaceholderEmail(session.user.email)) {
      setRequireBindIdentity(true)
    }
  }, [session?.user?.email])

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
      setError(signInError.message || m.auth.signInFailed)
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

  async function onWeChat() {
    setError(null)
    setRequireBindIdentity(false)
    setWechatPending(true)

    const started = await startWeChatMiniLogin()
    if (!started.ok) {
      setWechatPending(false)
      setError(started.message)
      return
    }

    const { ticket, openlink } = started.data
    startPolling(ticket)
    window.location.href = openlink
  }

  async function onBindIdentity(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!isWechatIdentityMethodEnabled(bindMethod)) {
      setError(m.auth.methodClosed)
      return
    }

    setBindPending(true)
    const result = await bindWeChatIdentity({
      method: bindMethod,
      email: bindMethod === "email" ? bindEmail.trim() : undefined,
      password: bindMethod === "email" ? bindPassword : undefined,
    })
    setBindPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    goAfterLogin()
  }

  const showWeChat = wechatMiniEnabled && inWeChat
  const description = requireBindIdentity
    ? m.auth.bindLead
    : showWeChat
      ? githubEnabled
        ? m.auth.loginLeadWechatGithub
        : m.auth.loginLeadWechat
      : githubEnabled
        ? m.auth.loginLeadGithub
        : m.auth.loginLead

  if (requireBindIdentity) {
    return (
      <AuthCard>
        <CardHeader className="gap-2 pt-1">
          <CardTitle className="text-foreground/80 text-lg font-medium">{m.auth.bindTitle}</CardTitle>
          <CardDescription className="leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-muted/50 ring-foreground/10 flex flex-wrap gap-1 rounded-full p-0.5 ring-1">
            {WECHAT_IDENTITY_METHODS.map((method) => {
              const enabled = isWechatIdentityMethodEnabled(method)
              const selected = bindMethod === method
              return (
                <Button
                  key={method}
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!enabled || bindPending}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium sm:text-sm",
                    selected && "bg-background text-primary shadow-sm",
                    !enabled && "opacity-60"
                  )}
                  onClick={() => {
                    if (enabled) {
                      setBindMethod(method)
                      setError(null)
                    }
                  }}
                >
                  {method === "email" ? m.auth.methodEmail : m.auth.methodPhone}
                  {!enabled ? m.auth.comingSoon : null}
                </Button>
              )
            })}
          </div>

          <form className="flex flex-col gap-3" onSubmit={onBindIdentity}>
            {bindMethod === "email" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bind-email">{m.auth.email}</Label>
                  <Input
                    id="bind-email"
                    type="email"
                    autoComplete="email"
                    required
                    className={authFieldClass}
                    value={bindEmail}
                    onChange={(e) => setBindEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bind-password">{m.auth.password}</Label>
                  <Input
                    id="bind-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={authFieldClass}
                    value={bindPassword}
                    onChange={(e) => setBindPassword(e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{m.auth.bindHint}</p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{m.auth.phoneSoon}</p>
            )}
            {error ? (
              <p role="alert" className={authAlertClass}>
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={bindPending || !isWechatIdentityMethodEnabled(bindMethod)}
              className={authPrimaryButtonClass}
            >
              {bindPending ? m.auth.binding : m.auth.confirmBind}
            </Button>
          </form>
        </CardContent>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <CardHeader className="gap-2 pt-1">
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {idleLoggedOut ? (
          <p
            role="status"
            className="rounded-xl border border-amber-400 bg-amber-100 px-3 py-2.5 text-sm leading-relaxed text-amber-950 dark:border-amber-300/50 dark:bg-amber-400/20 dark:text-amber-50"
          >
            {m.auth.idleNotice}
          </p>
        ) : null}

        {showWeChat ? (
          <>
            <Button
              type="button"
              disabled={wechatPending}
              className={authPrimaryButtonClass}
              onClick={() => void onWeChat()}
            >
              {wechatPending ? m.auth.wechatOpening : m.auth.wechat}
            </Button>
            {wechatPending ? (
              <p className="text-muted-foreground text-center text-sm leading-relaxed">{m.auth.wechatHint}</p>
            ) : null}
            <AuthDivider />
          </>
        ) : null}

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
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
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={authFieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className={authAlertClass}>
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className={authPrimaryButtonClass}>
            {pending ? m.auth.signingIn : m.auth.signIn}
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
              {m.auth.githubSignIn}
            </Button>
          </>
        ) : null}

        <p className="text-muted-foreground border-border/60 border-t pt-4 text-center text-sm">
          {m.auth.noAccount}{" "}
          <Link href="/register" className="text-primary font-medium underline-offset-4 hover:underline">
            {m.auth.signUp}
          </Link>
        </p>
      </CardContent>
    </AuthCard>
  )
}
