import { idleActivityChannelName, idleActivityStorageKey } from "@/lib/auth-idle"
import type { Locale } from "@/lib/i18n/locale"

export type IdleBroadcastMessage = { type: "activity"; ts: number } | { type: "logout"; reason: "idle" | "manual" }

export function readLastActivityTs() {
  try {
    const raw = localStorage.getItem(idleActivityStorageKey)
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeLastActivityTs(ts: number) {
  try {
    localStorage.setItem(idleActivityStorageKey, String(ts))
  } catch {
    // ignore
  }
}

export function clearLastActivityTs() {
  try {
    localStorage.removeItem(idleActivityStorageKey)
  } catch {
    // ignore
  }
}

export function openIdleChannel() {
  try {
    return new BroadcastChannel(idleActivityChannelName)
  } catch {
    return null
  }
}

export function publishIdleMessage(channel: BroadcastChannel | null, message: IdleBroadcastMessage) {
  try {
    channel?.postMessage(message)
  } catch {
    // ignore
  }
}

export function formatIdleCountdown(remainingMs: number, locale: Locale = "zh") {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const padded = seconds.toString().padStart(2, "0")
  if (locale === "en") {
    if (minutes <= 0) return `${seconds} sec`
    return `${minutes} min ${padded} sec`
  }
  if (minutes <= 0) return `${seconds} 秒`
  return `${minutes} 分 ${padded} 秒`
}

export function idleLoginHref(callbackPath?: string | null) {
  const params = new URLSearchParams({ reason: "idle" })
  if (callbackPath && callbackPath.startsWith("/") && !callbackPath.startsWith("//")) {
    params.set("callbackUrl", callbackPath)
  }
  return `/login?${params.toString()}`
}
