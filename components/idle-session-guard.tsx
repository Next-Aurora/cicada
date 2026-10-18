"use client"

import { useRouter } from "next/navigation"
import { useEffect, useEffectEvent, useRef } from "react"

import { authClient } from "@/lib/auth-client"

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "pointerdown"] as const

type IdleSessionGuardProps = {
  /** Idle duration before automatic sign-out. */
  timeoutMs: number
}

export function IdleSessionGuard({ timeoutMs }: IdleSessionGuardProps) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const lastActivityAt = useRef(Date.now())
  const signingOut = useRef(false)

  const touch = useEffectEvent(() => {
    lastActivityAt.current = Date.now()
  })

  const logoutIfIdle = useEffectEvent(async () => {
    if (!session?.user || signingOut.current) return
    if (Date.now() - lastActivityAt.current < timeoutMs) return

    signingOut.current = true
    try {
      await authClient.signOut()
      router.refresh()
    } finally {
      signingOut.current = false
    }
  })

  useEffect(() => {
    if (!session?.user) return

    lastActivityAt.current = Date.now()
    signingOut.current = false

    const onActivity = () => {
      touch()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void logoutIfIdle()
      }
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }
    document.addEventListener("visibilitychange", onVisibility)

    const timer = window.setInterval(() => {
      void logoutIfIdle()
    }, Math.min(30_000, Math.max(5_000, Math.floor(timeoutMs / 12))))

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity)
      }
      document.removeEventListener("visibilitychange", onVisibility)
      window.clearInterval(timer)
    }
  }, [session?.user, timeoutMs])

  return null
}
