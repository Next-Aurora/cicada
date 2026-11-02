export type Cue = {
  id: string
  start: number
  end: number
  text: string
}

export function parseSubtitles(raw: string): Cue[] {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  if (/^\s*WEBVTT/i.test(text) || /-->/.test(text) && !/^Dialogue:/m.test(text)) {
    const cues = parseTimedBlocks(text)
    if (cues.length > 0) return cues
  }
  if (/^Dialogue:/m.test(text)) {
    const cues = parseAss(text)
    if (cues.length > 0) return cues
  }
  return parseTimedBlocks(text)
}

export function decodeSubtitleBytes(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder("gb18030").decode(bytes)
  }
}

function parseTimedBlocks(raw: string): Cue[] {
  const blocks = raw.split(/\n{2,}/)
  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("WEBVTT") && !line.startsWith("NOTE"))
    const timingIndex = lines.findIndex((line) => line.includes("-->"))
    const timing = timingIndex >= 0 ? lines[timingIndex] : undefined
    if (!timing) continue
    const times = timing.split("-->")
    const start = parseClock(times[0] ?? "")
    const end = parseClock(times[1] ?? "")
    if (start === null || end === null || end <= start) continue
    const text = lines.slice(timingIndex + 1).join("\n").trim()
    if (!text) continue
    cues.push({ id: `c${cues.length}`, start, end, text })
  }
  return cues
}

function parseAss(raw: string): Cue[] {
  const cues: Cue[] = []
  for (const line of raw.split("\n")) {
    if (!line.startsWith("Dialogue:")) continue
    const body = line.slice("Dialogue:".length).trim()
    const parts = body.split(",")
    if (parts.length < 10) continue
    const start = parseClock(parts[1] ?? "")
    const end = parseClock(parts[2] ?? "")
    if (start === null || end === null || end <= start) continue
    const text = cleanAssText(parts.slice(9).join(","))
    if (!text) continue
    cues.push({ id: `c${cues.length}`, start, end, text })
  }
  return cues
}

function cleanAssText(value: string) {
  return value
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\[Nn]/g, "\n")
    .replace(/\\h/g, " ")
    .trim()
}

function parseClock(value: string): number | null {
  const match = value.trim().match(/(?:(\d+):)?(\d+):(\d+)[.,](\d{1,3})/)
  if (!match) return null
  const hours = match[1] ? Number(match[1]) : 0
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const fraction = (match[4] ?? "0").padEnd(3, "0").slice(0, 3)
  const millis = Number(fraction)
  if ([hours, minutes, seconds, millis].some((part) => Number.isNaN(part))) return null
  return hours * 3600 + minutes * 60 + seconds + millis / 1000
}
