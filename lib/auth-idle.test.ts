import { afterEach, describe, expect, it } from "vitest"

import { getIdleTimeoutMinutes, getIdleTimeoutMs, getIdleTimeoutSeconds, getIdleWarningMs } from "./auth-idle"

describe("auth idle timeout", () => {
  afterEach(() => {
    delete process.env.AUTH_IDLE_TIMEOUT_MINUTES
  })

  it("defaults to 10 minutes", () => {
    delete process.env.AUTH_IDLE_TIMEOUT_MINUTES
    expect(getIdleTimeoutMinutes()).toBe(10)
    expect(getIdleTimeoutSeconds()).toBe(600)
    expect(getIdleTimeoutMs()).toBe(600_000)
  })

  it("reads AUTH_IDLE_TIMEOUT_MINUTES", () => {
    process.env.AUTH_IDLE_TIMEOUT_MINUTES = "15"
    expect(getIdleTimeoutMinutes()).toBe(15)
  })

  it("clamps invalid and out-of-range values", () => {
    process.env.AUTH_IDLE_TIMEOUT_MINUTES = "0"
    expect(getIdleTimeoutMinutes()).toBe(1)

    process.env.AUTH_IDLE_TIMEOUT_MINUTES = "99999"
    expect(getIdleTimeoutMinutes()).toBe(24 * 60)

    process.env.AUTH_IDLE_TIMEOUT_MINUTES = "abc"
    expect(getIdleTimeoutMinutes()).toBe(10)
  })

  it("computes warning window", () => {
    expect(getIdleWarningMs(600_000)).toBe(60_000)
    expect(getIdleWarningMs(60_000)).toBe(30_000)
    expect(getIdleWarningMs(10_000)).toBe(10_000)
  })
})
