const DEFAULT_IDLE_TIMEOUT_MINUTES = 10
const MIN_IDLE_TIMEOUT_MINUTES = 1
const MAX_IDLE_TIMEOUT_MINUTES = 24 * 60

/** Absolute Better Auth session lifetime (sliding); idle logout is client-driven. */
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24

/** How often a used session may be refreshed on the server. */
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60

const ACTIVITY_STORAGE_KEY = "cicada:last-activity"
const ACTIVITY_CHANNEL_NAME = "cicada-auth-idle"

export function getIdleTimeoutMinutes() {
  const raw = process.env.AUTH_IDLE_TIMEOUT_MINUTES?.trim()
  if (!raw) return DEFAULT_IDLE_TIMEOUT_MINUTES

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_IDLE_TIMEOUT_MINUTES

  return Math.min(MAX_IDLE_TIMEOUT_MINUTES, Math.max(MIN_IDLE_TIMEOUT_MINUTES, Math.floor(parsed)))
}

export function getIdleTimeoutSeconds() {
  return getIdleTimeoutMinutes() * 60
}

export function getIdleTimeoutMs() {
  return getIdleTimeoutSeconds() * 1000
}

/** Warn before logout; capped so short idle windows still get a notice. */
export function getIdleWarningMs(timeoutMs: number) {
  return Math.min(60_000, Math.max(10_000, Math.floor(timeoutMs / 2)))
}

export const idleActivityStorageKey = ACTIVITY_STORAGE_KEY
export const idleActivityChannelName = ACTIVITY_CHANNEL_NAME
