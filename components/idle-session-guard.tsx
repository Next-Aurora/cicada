"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import {
  clearLastActivityTs,
  formatIdleCountdown,
  idleLoginHref,
  openIdleChannel,
  publishIdleMessage,
  readLastActivityTs,
  writeLastActivityTs,
  type IdleBroadcastMessage,
} from "@/lib/auth-idle-client"
import { getIdleWarningMs, idleActivityStorageKey } from "@/lib/auth-idle"
import { safeCallbackUrl } from "@/lib/safe-callback-url"

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "pointerdown"] as const
const TOUCH_THROTTLE_MS = 1_000
const SESSION_REFRESH_THROTTLE_MS = 60_000

type IdleSessionGuardProps = {
  timeoutMs: number
}

export function IdleSessionGuard({ timeoutMs }: IdleSessionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  const lastActivityAt = useRef(Date.now())
  const lastTouchWriteAt = useRef(0)
  const lastSessionRefreshAt = useRef(0)
  const signingOut = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const warningMs = getIdleWarningMs(timeoutMs)
  const showWarning = remainingMs !== null && remainingMs <= warningMs

  const syncFromShared = () => {
    const shared = readLastActivityTs()
    if (shared !== null && shared > lastActivityAt.current) {
      lastActivityAt.current = shared
    }
  }

  const touch = useEffectEvent((options?: { refreshSession?: boolean; force?: boolean }) => {
    const now = Date.now()
    if (!options?.force && now - lastTouchWriteAt.current < TOUCH_THROTTLE_MS) {
      lastActivityAt.current = now
      return
    }

    lastTouchWriteAt.current = now
    lastActivityAt.current = now
    writeLastActivityTs(now)
    setRemainingMs(timeoutMs)
    publishIdleMessage(channelRef.current, { type: "activity", ts: now })

    if (
      options?.refreshSession &&
      now - lastSessionRefreshAt.current >= SESSION_REFRESH_THROTTLE_MS
    ) {
      lastSessionRefreshAt.current = now
      void authClient.getSession()
    }
  })

  const logoutForIdle = useEffectEvent(async () => {
    if (!session?.user || signingOut.current) return

    signingOut.current = true
    setRemainingMs(null)
    const next = idleLoginHref(safeCallbackUrl(pathname))
    try {
      publishIdleMessage(channelRef.current, { type: "logout", reason: "idle" })
      clearLastActivityTs()
      await authClient.signOut()
      router.replace(next)
      router.refresh()
    } finally {
      signingOut.current = false
    }
  })

  const evaluateIdle = useEffectEvent(() => {
    if (!session?.user || signingOut.current) return 0

    syncFromShared()
    const remaining = timeoutMs - (Date.now() - lastActivityAt.current)

    if (remaining <= 0) {
      setRemainingMs(0)
      void logoutForIdle()
      return 0
    }

    setRemainingMs(remaining)
    return remaining
  })

  useEffect(() => {
    if (!session?.user) {
      setRemainingMs(null)
      return
    }

    lastActivityAt.current = Date.now()
    lastTouchWriteAt.current = 0
    lastSessionRefreshAt.current = 0
    signingOut.current = false
    writeLastActivityTs(lastActivityAt.current)
    setRemainingMs(timeoutMs)

    let timer: number | undefined
    channelRef.current = openIdleChannel()

    const schedule = () => {
      if (timer) window.clearTimeout(timer)
      const remaining = evaluateIdle()
      if (remaining <= 0) return

      const idleFor = Date.now() - lastActivityAt.current
      const msUntilWarning = timeoutMs - warningMs - idleFor
      const delay =
        msUntilWarning > 0
          ? Math.min(msUntilWarning, remaining)
          : Math.min(1_000, remaining)

      timer = window.setTimeout(schedule, Math.max(250, delay))
    }

    const onActivity = () => {
      touch({ refreshSession: true })
      schedule()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        schedule()
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== idleActivityStorageKey) return
      if (!event.newValue) return
      const parsed = Number(event.newValue)
      if (!Number.isFinite(parsed)) return
      lastActivityAt.current = Math.max(lastActivityAt.current, parsed)
      setRemainingMs(timeoutMs - (Date.now() - lastActivityAt.current))
      schedule()
    }

    const onChannelMessage = (event: MessageEvent<IdleBroadcastMessage>) => {
      const data = event.data
      if (data?.type === "activity" && typeof data.ts === "number") {
        lastActivityAt.current = Math.max(lastActivityAt.current, data.ts)
        setRemainingMs(timeoutMs - (Date.now() - lastActivityAt.current))
        schedule()
        return
      }
      if (data?.type === "logout") {
        void (async () => {
          if (signingOut.current) return
          signingOut.current = true
          setRemainingMs(null)
          try {
            clearLastActivityTs()
            await authClient.signOut()
            if (data.reason === "idle") {
              router.replace(idleLoginHref(safeCallbackUrl(pathname)))
            }
            router.refresh()
          } finally {
            signingOut.current = false
          }
        })()
      }
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("storage", onStorage)
    if (channelRef.current) {
      channelRef.current.onmessage = onChannelMessage
    }

    const iframePoll = pathname.startsWith("/g/")
      ? window.setInterval(() => {
          if (document.activeElement?.tagName === "IFRAME") {
            touch({ refreshSession: false })
            schedule()
          }
        }, 5_000)
      : undefined

    schedule()

    return () => {
      if (timer) window.clearTimeout(timer)
      if (iframePoll) window.clearInterval(iframePoll)
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity)
      }
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("storage", onStorage)
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [session?.user, timeoutMs, warningMs, pathname, router])

  if (!session?.user || !showWarning || remainingMs === null) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-card text-card-foreground fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-col gap-3 rounded-xl border p-4 shadow-lg sm:inset-x-auto sm:right-6"
    >
      <div>
        <p className="font-medium">即将因闲置退出登录</p>
        <p className="text-muted-foreground mt-1 text-sm">
          约 {formatIdleCountdown(remainingMs)} 后自动退出。继续操作可保持登录。
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="self-start"
        onClick={() => {
          touch({ refreshSession: true, force: true })
        }}
      >
        继续使用
      </Button>
    </div>
  )
}
