/** Server-only flags derived from env (safe to pass as props to client). */
export function isGitHubAuthEnabled() {
  return Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim())
}

/** In-WeChat H5 login that opens this site's mini program. Uses that mini program's openid. */
export function isWeChatMiniAuthEnabled() {
  return Boolean(process.env.WECHAT_MINI_APP_ID?.trim() && process.env.WECHAT_MINI_APP_SECRET?.trim())
}

export function getTrustedOrigins() {
  const origins = new Set<string>()

  const base = process.env.BETTER_AUTH_URL?.trim()
  if (base) {
    try {
      origins.add(new URL(base).origin)
    } catch {
      // ignore invalid BETTER_AUTH_URL
    }
  }

  origins.add("http://localhost:3000")
  origins.add("https://www.cicadar.cn")
  origins.add("https://cicadar.cn")

  for (const extra of (process.env.AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const value = extra.trim()
    if (value) origins.add(value.replace(/\/$/, ""))
  }

  return Array.from(origins)
}
