import { describe, expect, it } from "vitest"

import {
  isWechatIdentityMethod,
  isWechatIdentityMethodEnabled,
  wechatIdentityMethodLabel,
} from "@/lib/wechat-identity"

describe("wechat identity methods", () => {
  it("recognizes reserved and enabled methods", () => {
    expect(isWechatIdentityMethod("email")).toBe(true)
    expect(isWechatIdentityMethod("phone")).toBe(true)
    expect(isWechatIdentityMethod("username")).toBe(false)
    expect(isWechatIdentityMethodEnabled("email")).toBe(true)
    expect(isWechatIdentityMethodEnabled("phone")).toBe(false)
  })

  it("labels methods for UI", () => {
    expect(wechatIdentityMethodLabel("email")).toBe("邮箱")
    expect(wechatIdentityMethodLabel("phone")).toBe("手机号")
  })
})
