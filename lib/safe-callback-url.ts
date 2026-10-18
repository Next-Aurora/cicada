/**
 * Only allow same-site relative paths for post-login redirects.
 * Rejects protocol-relative (`//evil.com`) and absolute URLs.
 */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback

  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback
  }

  if (trimmed.includes("\\") || trimmed.includes("\0")) {
    return fallback
  }

  try {
    const url = new URL(trimmed, "http://localhost")
    if (url.origin !== "http://localhost") {
      return fallback
    }
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}
