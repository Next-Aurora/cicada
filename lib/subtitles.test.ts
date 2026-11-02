import { describe, expect, it } from "vitest"

import { parseSubtitles } from "./subtitles"

describe("parseSubtitles", () => {
  it("reads srt cues and keeps clickable times", () => {
    const cues = parseSubtitles(`1
00:00:01,500 --> 00:00:03,000
你好

2
00:00:04,000 --> 00:00:05,250
第二句`)
    expect(cues).toEqual([
      { id: "c0", start: 1.5, end: 3, text: "你好" },
      { id: "c1", start: 4, end: 5.25, text: "第二句" },
    ])
  })

  it("strips ass tags and converts line breaks", () => {
    const cues = parseSubtitles(`[Events]
Dialogue: 0,0:01:02.50,0:01:04.00,Default,,0,0,0,,{\\b1}第一行\\N第二行`)
    expect(cues[0]).toMatchObject({ start: 62.5, end: 64, text: "第一行\n第二行" })
  })
})
