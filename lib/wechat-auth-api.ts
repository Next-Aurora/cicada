import type { WechatIdentityMethod } from "@/lib/wechat-identity"

type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

async function postAuthJson<T>(
  path: string,
  body: Record<string, string> = {},
): Promise<JsonResult<T>> {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "微信登录失败，请稍后重试"
    return { ok: false, message }
  }

  return { ok: true, data: payload as T }
}

export function startWeChatMiniLogin() {
  return postAuthJson<{ ticket: string; openlink: string; bindReady: boolean }>("/wechat-mini/start")
}

export function pollWeChatMiniLogin(ticket: string) {
  return postAuthJson<{
    status: "pending" | "ok" | "expired" | "restart"
    requireBindIdentity?: boolean
  }>("/wechat-mini/poll", { ticket })
}

export function bindWeChatIdentity(input: {
  method: WechatIdentityMethod
  email?: string
  password?: string
  phone?: string
}) {
  const body: Record<string, string> = { method: input.method }
  if (input.email) body.email = input.email
  if (input.password) body.password = input.password
  if (input.phone) body.phone = input.phone
  return postAuthJson<{ ok: true; method: string }>("/wechat-mini/bind-identity", body)
}
