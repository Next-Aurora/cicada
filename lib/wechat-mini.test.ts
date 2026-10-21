import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createMiniProgramScheme,
  exchangeMiniProgramCode,
  hashWechatNonce,
  resetWechatAccessTokenCache,
  wechatPublicMessage,
  wechatUserEmail,
} from "@/lib/wechat-mini"

describe("wechat-mini helpers", () => {
  afterEach(() => {
    resetWechatAccessTokenCache()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("hashes nonce stably", () => {
    expect(hashWechatNonce("abc")).toBe(hashWechatNonce("abc"))
    expect(hashWechatNonce("abc")).not.toBe(hashWechatNonce("abd"))
  })

  it("builds a stable placeholder email from openid", () => {
    expect(wechatUserEmail("openid-1")).toMatch(/^wx\.[a-f0-9]{64}@users\.cicada\.invalid$/)
    expect(wechatUserEmail("openid-1")).toBe(wechatUserEmail("openid-1"))
  })

  it("maps common WeChat error codes", () => {
    expect(wechatPublicMessage(40029)).toContain("登录码")
    expect(wechatPublicMessage(85079)).toContain("小程序")
  })

  it("creates a mini program URL scheme", async () => {
    vi.stubEnv("WECHAT_MINI_APP_ID", "wx123")
    vi.stubEnv("WECHAT_MINI_APP_SECRET", "secret")

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ openlink: "weixin://dl/business/?t=abc" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )

    await expect(createMiniProgramScheme("ticket-1", { fetchImpl })).resolves.toBe(
      "weixin://dl/business/?t=abc",
    )
  })

  it("exchanges js code for openid", async () => {
    vi.stubEnv("WECHAT_MINI_APP_ID", "wx123")
    vi.stubEnv("WECHAT_MINI_APP_SECRET", "secret")

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ openid: "oOPEN", session_key: "k" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    await expect(exchangeMiniProgramCode("code-1", fetchImpl)).resolves.toEqual({ openid: "oOPEN" })
  })
})
