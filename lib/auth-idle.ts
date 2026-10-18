const DEFAULT_IDLE_TIMEOUT_MINUTES = 10
const MIN_IDLE_TIMEOUT_MINUTES = 1
const MAX_IDLE_TIMEOUT_MINUTES = 24 * 60

/** Idle timeout in minutes from AUTH_IDLE_TIMEOUT_MINUTES (default 10). */
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
