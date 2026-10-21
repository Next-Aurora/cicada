import { createHash, randomBytes } from "node:crypto"

import { isWeChatMiniAuthEnabled } from "@/lib/auth-flags"

export const WECHAT_MINI_PROVIDER_ID = "wechat-mini"
export const WECHAT_TICKET_PENDING = "pending"
export const WECHAT_TICKET_READY = "ready"
export const WECHAT_TICKET_CONSUMED = "consumed"
export const WECHAT_TICKET_TTL_SECONDS = 3 * 60
export const WECHAT_NONCE_COOKIE = "wechat-mini-nonce"

const ENV_VERSIONS = new Set(["release", "trial", "develop"])

type WechatPayload = {
  errcode?: number
  errmsg?: string
  access_token?: string
  expires_in?: number
  openlink?: string
  openid?: string
}

export class WechatMiniError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WechatMiniError"
  }
}

let accessTokenCache: { token: string; expiresAt: number } | null = null

export function resetWechatAccessTokenCache() {
  accessTokenCache = null
}

export function createWechatTicketId() {
  return randomBytes(24).toString("base64url")
}

export function createWechatNonce() {
  return randomBytes(32).toString("base64url")
}

export function hashWechatNonce(nonce: string) {
  return createHash("sha256").update(nonce).digest("hex")
}

export function wechatUserEmail(openid: string) {
  const digest = createHash("sha256").update(openid).digest("hex")
  return `wx.${digest}@users.cicada.invalid`
}

export function readWechatMiniEnvVersion() {
  const value = process.env.WECHAT_MINI_ENV_VERSION?.trim() || "release"
  if (!ENV_VERSIONS.has(value)) {
    throw new WechatMiniError("WECHAT_MINI_ENV_VERSION 只能是 release、trial 或 develop")
  }
  return value
}

export function readWechatMiniLoginPath() {
  const value = process.env.WECHAT_MINI_LOGIN_PATH?.trim() || "pages/login/index"
  return value.replace(/^\/+/, "")
}

export function wechatPublicMessage(errcode: number | undefined) {
  switch (errcode) {
    case 40029:
    case 40163:
      return "微信登录码已失效，请回到网页重新登录"
    case 40013:
    case 40125:
      return "小程序 AppID 或 AppSecret 不正确"
    case 85079:
    case 85401:
      return "暂时无法拉起小程序，请确认小程序已发布，或改用 trial / develop 版本"
    default:
      return "微信登录暂时失败，请稍后再试"
  }
}

function assertWechatOk(data: WechatPayload) {
  if (typeof data.errcode === "number" && data.errcode !== 0) {
    console.error(`[wechat-mini] api error ${data.errcode}`)
    throw new WechatMiniError(wechatPublicMessage(data.errcode))
  }
}

async function readWechatJson(response: Response) {
  const data = (await response.json()) as WechatPayload
  if (!response.ok) {
    throw new WechatMiniError("微信登录暂时失败，请稍后再试")
  }
  assertWechatOk(data)
  return data
}

function requireMiniProgramCredentials() {
  const appId = process.env.WECHAT_MINI_APP_ID?.trim()
  const secret = process.env.WECHAT_MINI_APP_SECRET?.trim()
  if (!appId || !secret || !isWeChatMiniAuthEnabled()) {
    throw new WechatMiniError("微信登录未配置")
  }
  return { appId, secret }
}

export async function getWechatMiniAccessToken(fetchImpl: typeof fetch = fetch) {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token
  }

  const { appId, secret } = requireMiniProgramCredentials()
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token")
  url.searchParams.set("grant_type", "client_credential")
  url.searchParams.set("appid", appId)
  url.searchParams.set("secret", secret)

  const data = await readWechatJson(await fetchImpl(url))
  if (!data.access_token) {
    throw new WechatMiniError("微信登录暂时失败，请稍后再试")
  }

  const expiresIn = Number(data.expires_in ?? 7200)
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 7200) * 1000,
  }
  return data.access_token
}

export async function createMiniProgramScheme(
  ticket: string,
  options: { bindReady?: boolean; fetchImpl?: typeof fetch } = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch
  const accessToken = await getWechatMiniAccessToken(fetchImpl)
  const url = new URL("https://api.weixin.qq.com/wxa/generatescheme")
  url.searchParams.set("access_token", accessToken)

  const query = new URLSearchParams({ ticket })
  if (options.bindReady) query.set("bind", "1")

  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jump_wxa: {
        path: readWechatMiniLoginPath(),
        query: query.toString(),
        env_version: readWechatMiniEnvVersion(),
      },
      is_expire: true,
      expire_type: 1,
      expire_interval: 1,
    }),
  })
  const data = await readWechatJson(response)
  if (!data.openlink?.startsWith("weixin://")) {
    throw new WechatMiniError("暂时无法拉起小程序")
  }
  return data.openlink
}

export async function exchangeMiniProgramCode(code: string, fetchImpl: typeof fetch = fetch) {
  const { appId, secret } = requireMiniProgramCredentials()
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session")
  url.searchParams.set("appid", appId)
  url.searchParams.set("secret", secret)
  url.searchParams.set("js_code", code)
  url.searchParams.set("grant_type", "authorization_code")

  const data = await readWechatJson(await fetchImpl(url))
  if (!data.openid) {
    throw new WechatMiniError("微信登录暂时失败，请稍后再试")
  }
  return { openid: data.openid }
}
