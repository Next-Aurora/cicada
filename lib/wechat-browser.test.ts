import { describe, expect, it } from "vitest"

import { isWeChatInAppBrowser } from "@/lib/wechat-browser"

describe("isWeChatInAppBrowser", () => {
  it("detects WeChat user agents", () => {
    expect(
      isWeChatInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49",
      ),
    ).toBe(true)
  })

  it("rejects regular browsers", () => {
    expect(
      isWeChatInAppBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false)
  })
})
