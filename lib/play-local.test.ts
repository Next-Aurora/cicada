import { describe, expect, it } from "vitest"

import { mergeProgress, pendingUpload, upsertProgress, type PlayRecord } from "./play-local"

function record(fid: string, position: number): PlayRecord {
  return { fid, name: fid, kind: "video", position, offset: 0, updatedAt: position }
}

describe("upsertProgress", () => {
  it("keeps the latest play first and drops the duplicate", () => {
    const items = upsertProgress([record("a", 1), record("b", 2)], record("a", 9))
    expect(items.map((item) => item.fid)).toEqual(["a", "b"])
    expect(items[0]?.position).toBe(9)
  })

  it("caps the list", () => {
    const items = upsertProgress([record("a", 1), record("b", 2)], record("c", 3), 2)
    expect(items.map((item) => item.fid)).toEqual(["c", "a"])
  })

  it("does not let an older save replace a newer one", () => {
    const items = upsertProgress([record("a", 9)], record("a", 2))
    expect(items[0]?.position).toBe(9)
  })
})

describe("mergeProgress", () => {
  it("keeps the newer copy of the same file and the other files", () => {
    const merged = mergeProgress([record("a", 2), record("b", 5)], [record("a", 8), record("c", 1)])
    expect(merged.map((item) => [item.fid, item.position])).toEqual([
      ["a", 8],
      ["b", 5],
      ["c", 1],
    ])
  })

  it("uploads only local rows that are newer than the account", () => {
    const pending = pendingUpload([record("a", 2), record("b", 9)], [record("a", 8)])
    expect(pending.map((item) => item.fid)).toEqual(["b"])
  })
})