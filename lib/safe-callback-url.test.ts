import { describe, expect, it } from "vitest"

import { safeCallbackUrl } from "./safe-callback-url"

describe("safeCallbackUrl", () => {
  it("allows relative paths", () => {
    expect(safeCallbackUrl("/guides")).toBe("/guides")
    expect(safeCallbackUrl("/g/liuzhou?x=1")).toBe("/g/liuzhou?x=1")
  })

  it("rejects absolute and protocol-relative urls", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/")
    expect(safeCallbackUrl("//evil.com")).toBe("/")
    expect(safeCallbackUrl("https://evil.com/phish")).toBe("/")
  })

  it("uses fallback for empty values", () => {
    expect(safeCallbackUrl(null, "/guides")).toBe("/guides")
    expect(safeCallbackUrl("", "/guides")).toBe("/guides")
  })
})
