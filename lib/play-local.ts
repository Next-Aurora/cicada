export type PlayRecord = {
  fid: string
  name: string
  kind: "video" | "audio"
  position: number
  offset: number
  updatedAt: number
}

export type LocalQuark = {
  refreshToken: string
  deviceId: string
  displayName: string | null
}

export type LocalAssrt = {
  token: string
  quota: number
}

const historyKey = "cicada-play-history"
const quarkKey = "cicada-play-quark"
const deviceKey = "cicada-play-quark-device"
const assrtKey = "cicada-play-assrt"

export function upsertProgress(items: PlayRecord[], next: PlayRecord, limit = 20): PlayRecord[] {
  const current = items.find((item) => item.fid === next.fid)
  if (current && current.updatedAt > next.updatedAt) return items
  return [next, ...items.filter((item) => item.fid !== next.fid)].slice(0, limit)
}

export function mergeProgress(local: PlayRecord[], cloud: PlayRecord[], limit = 20): PlayRecord[] {
  const byFid = new Map<string, PlayRecord>()
  for (const item of cloud) byFid.set(item.fid, item)
  for (const item of local) {
    const current = byFid.get(item.fid)
    if (!current || item.updatedAt > current.updatedAt) byFid.set(item.fid, item)
  }
  return Array.from(byFid.values())
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, limit)
}

export function pendingUpload(local: PlayRecord[], cloud: PlayRecord[]): PlayRecord[] {
  const cloudAt = new Map(cloud.map((item) => [item.fid, item.updatedAt]))
  return local.filter((item) => item.updatedAt > (cloudAt.get(item.fid) ?? Number.NEGATIVE_INFINITY))
}

export function localArea(key: string | null): "history" | "quark" | "assrt" | null {
  if (key === historyKey) return "history"
  if (key === quarkKey) return "quark"
  if (key === assrtKey) return "assrt"
  return null
}

export function readHistory(): PlayRecord[] {
  return readArray(historyKey).flatMap((item) => (isRecord(item) ? [item] : []))
}

export function writeHistory(items: PlayRecord[]) {
  write(historyKey, mergeProgress(items, readHistory()))
}

export function clearHistory() {
  remove(historyKey)
}

export function readQuark(): LocalQuark | null {
  const value = readObject(quarkKey)
  if (!value) return null
  const refreshToken = text(value.refreshToken)
  const deviceId = text(value.deviceId)
  if (!refreshToken || !deviceId) return null
  const displayName = text(value.displayName)
  return { refreshToken, deviceId, displayName }
}

export function writeQuark(value: LocalQuark) {
  write(quarkKey, value)
}

export function clearQuark() {
  remove(quarkKey)
}

export function readDevice(): string | null {
  if (typeof window === "undefined") return null
  const value = window.localStorage.getItem(deviceKey)?.trim() ?? ""
  return value.length >= 8 ? value : null
}

export function writeDevice(deviceId: string) {
  const value = deviceId.trim()
  if (value.length < 8 || typeof window === "undefined") return
  window.localStorage.setItem(deviceKey, value)
}

export function readAssrt(): LocalAssrt | null {
  const value = readObject(assrtKey)
  if (!value) return null
  const token = text(value.token)
  const quota = typeof value.quota === "number" ? value.quota : Number(value.quota)
  if (!token || !Number.isFinite(quota)) return null
  return { token, quota }
}

export function writeAssrt(value: LocalAssrt) {
  write(assrtKey, value)
}

export function clearAssrt() {
  remove(assrtKey)
}

function isRecord(value: unknown): value is PlayRecord {
  if (!value || typeof value !== "object") return false
  const item = value as PlayRecord
  return (
    typeof item.fid === "string" &&
    typeof item.name === "string" &&
    (item.kind === "video" || item.kind === "audio") &&
    typeof item.position === "number" &&
    typeof item.offset === "number" &&
    typeof item.updatedAt === "number"
  )
}

function readArray(key: string): unknown[] {
  const value = readJson(key)
  return Array.isArray(value) ? value : []
}

function readObject(key: string): Record<string, unknown> | null {
  const value = readJson(key)
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function remove(key: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(key)
}

function text(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}
