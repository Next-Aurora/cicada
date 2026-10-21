import { describe, expect, it } from "vitest"

import { decideWechatUserBinding, isWechatPlaceholderEmail } from "@/lib/wechat-bind"

describe("wechat bind decision", () => {
  it("detects placeholder emails", () => {
    expect(isWechatPlaceholderEmail("wx.abc@users.cicada.invalid")).toBe(true)
    expect(isWechatPlaceholderEmail("me@example.com")).toBe(false)
  })

  it("links openid to a verified email account", () => {
    expect(
      decideWechatUserBinding({
        existingWechatUserId: null,
        bindUserId: "email-user",
        bindUserIsPlaceholderEmail: false,
        bindUserAlreadyHasOtherWechat: false,
      }),
    ).toEqual({ ok: true, userId: "email-user", action: "link" })
  })

  it("rejects binding when WeChat is already on another user", () => {
    expect(
      decideWechatUserBinding({
        existingWechatUserId: "other",
        bindUserId: "email-user",
        bindUserIsPlaceholderEmail: false,
        bindUserAlreadyHasOtherWechat: false,
      }).ok,
    ).toBe(false)
  })

  it("rejects when the email account already has another WeChat", () => {
    expect(
      decideWechatUserBinding({
        existingWechatUserId: null,
        bindUserId: "email-user",
        bindUserIsPlaceholderEmail: false,
        bindUserAlreadyHasOtherWechat: true,
      }).ok,
    ).toBe(false)
  })

  it("creates a WeChat-only user when no bind target", () => {
    expect(
      decideWechatUserBinding({
        existingWechatUserId: null,
        bindUserId: null,
        bindUserIsPlaceholderEmail: false,
        bindUserAlreadyHasOtherWechat: false,
      }),
    ).toEqual({ ok: true, userId: "", action: "create" })
  })
})
