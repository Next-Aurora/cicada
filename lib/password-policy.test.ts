import { describe, expect, it } from "vitest"

import { isPasswordValid, passwordRules } from "./password-policy"

describe("password policy", () => {
  it("rejects a password shorter than 8 characters", () => {
    expect(isPasswordValid("1234567")).toBe(false)
    expect(passwordRules.find((rule) => rule.id === "min-length")?.test("1234567")).toBe(false)
  })

  it("accepts a password of 8 or more characters", () => {
    expect(isPasswordValid("12345678")).toBe(true)
  })
})
