import { describe, expect, it } from "vitest"

import { formatIdleCountdown, idleLoginHref } from "./auth-idle-client"

describe("auth idle client helpers", () => {
  it("formats countdown", () => {
    expect(formatIdleCountdown(1_000)).toBe("1 秒")
    expect(formatIdleCountdown(61_000)).toBe("1 分 01 秒")
    expect(formatIdleCountdown(0)).toBe("0 秒")
  })

  it("builds idle login href", () => {
    expect(idleLoginHref("/guides")).toBe("/login?reason=idle&callbackUrl=%2Fguides")
    expect(idleLoginHref("//evil.com")).toBe("/login?reason=idle")
    expect(idleLoginHref()).toBe("/login?reason=idle")
  })
})
