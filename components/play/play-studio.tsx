"use client"

import { Captions, FileAudio, FileVideo, Folder, LoaderCircle, PanelLeftClose, PanelRightClose, Settings } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react"

import { authAlertClass, authFieldClass, authPrimaryButtonClass } from "@/components/auth-card"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  clearAssrt as clearLocalAssrt,
  clearQuark,
  localArea,
  mergeProgress,
  pendingUpload,
  readAssrt,
  readHistory,
  readDevice,
  readQuark,
  upsertProgress,
  writeDevice,
  writeAssrt,
  writeHistory,
  writeQuark,
  type LocalAssrt,
  type LocalQuark,
  type PlayRecord,
} from "@/lib/play-local"
import { decodeSubtitleBytes, parseSubtitles, type Cue } from "@/lib/subtitles"
import { cn } from "@/lib/utils"

type CloudStatus = { linked: boolean; displayName: string | null; deviceId: string | null }
type DriveFile = { fid: string; name: string; size: number; kind: "folder" | "video" | "audio" | "subtitle" }
type AssrtSettings = { usingOwn: boolean; quotaPerMinute: number; tokenTail: string | null }
type SubtitleHit = { id: string; title: string; language: string | null; format: string | null; score: number }
type SubtitleSource = "local" | "url" | "sidecar" | "assrt" | null

const nativeExt = new Set(["mp4", "m4v", "webm", "mp3", "m4a", "aac", "wav", "ogg", "flac", "opus"])

const kindIcon = {
  folder: Folder,
  video: FileVideo,
  audio: FileAudio,
  subtitle: Captions,
} satisfies Record<DriveFile["kind"], typeof Folder>

function FileKindIcon({ kind }: { kind: DriveFile["kind"] }) {
  const Icon = kindIcon[kind]
  return <Icon aria-hidden className={cn("size-4 shrink-0", kind === "folder" ? "text-primary" : "text-muted-foreground")} />
}

type ServerProgress = { fid: string; name: string; kind: string; position: number; offset: number; updatedAt: string }
type MediaAuth = "account" | "local"

class MediaRequestError extends Error {
  constructor(
    message: string,
    readonly auth: MediaAuth
  ) {
    super(message)
  }
}

function toRecord(item: ServerProgress): PlayRecord | null {
  if (item.kind !== "video" && item.kind !== "audio") return null
  const updatedAt = Date.parse(item.updatedAt)
  if (!Number.isFinite(updatedAt)) return null
  return { fid: item.fid, name: item.name, kind: item.kind, position: item.position, offset: item.offset, updatedAt }
}

async function mediaFetch<T>(path: string, init: RequestInit | undefined, guest: LocalQuark | null): Promise<T & { refreshToken?: string; auth: MediaAuth }> {
  const headers = new Headers(init?.headers)
  if (guest) {
    headers.set("x-cicada-quark-refresh", guest.refreshToken)
    headers.set("x-cicada-quark-device", guest.deviceId)
  }
  const response = await fetch(path, { ...init, headers, cache: "no-store" })
  const auth: MediaAuth = response.headers.get("x-cicada-auth") === "account" ? "account" : "local"
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null
  if (!response.ok || !payload) {
    throw new MediaRequestError(payload?.message || "请求失败", auth)
  }
  return Object.assign(payload, { auth })
}

function stem(name: string) {
  return name.replace(/\.[^.]+$/, "").toLowerCase()
}

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

export function PlayStudio({ signedIn: initialSignedIn }: { signedIn: boolean }) {
  const { data: session, isPending } = authClient.useSession()
  const signedIn = isPending ? initialSignedIn : Boolean(session?.user)
  const { m } = useI18n()
  const copy = m.play
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const quarkRef = useRef<LocalQuark | null>(null)
  const qrPoll = useRef<number | null>(null)
  const qrDeadline = useRef<number | null>(null)
  const filesRequest = useRef(0)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const armedRef = useRef(false)
  const savedAt = useRef(0)
  const [status, setStatus] = useState<CloudStatus | null>(null)
  const [error, setError] = useState("")
  const [qrOpen, setQrOpen] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [qrMessage, setQrMessage] = useState("")
  const [qrConnecting, setQrConnecting] = useState(false)
  const [filesOpen, setFilesOpen] = useState(true)
  const [subsOpen, setSubsOpen] = useState(true)
  const [stageFull, setStageFull] = useState(false)
  const [fullFiles, setFullFiles] = useState(false)
  const [fullSubs, setFullSubs] = useState(false)
  const [refreshToken, setRefreshToken] = useState("")
  const [deviceId, setDeviceId] = useState("")
  const [files, setFiles] = useState<DriveFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [listedFid, setListedFid] = useState<string | null>(null)
  const [folder, setFolder] = useState<{ fid: string; name: string }[]>([{ fid: "0", name: copy.root }])
  const [current, setCurrent] = useState<DriveFile | null>(null)
  const [streamUrl, setStreamUrl] = useState("")
  const [cues, setCues] = useState<Cue[]>([])
  const [source, setSource] = useState<SubtitleSource>(null)
  const [offset, setOffset] = useState(0)
  const [time, setTime] = useState(0)
  const [subtitleUrl, setSubtitleUrl] = useState("")
  const [hits, setHits] = useState<SubtitleHit[]>([])
  const [assrt, setAssrt] = useState<AssrtSettings | null>(null)
  const [ownToken, setOwnToken] = useState("")
  const [ownQuota, setOwnQuota] = useState("20")
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<PlayRecord[]>([])

  const parent = folder[folder.length - 1]

  function showAssrt(own: LocalAssrt | null) {
    if (!own) return false
    setAssrt({ usingOwn: true, quotaPerMinute: own.quota, tokenTail: own.token.slice(-4) })
    setOwnQuota(String(own.quota))
    return true
  }

  async function call<T>(path: string, init?: RequestInit) {
    const payload = await mediaFetch<T>(path, init, signedIn ? null : quarkRef.current)
    if (signedIn && payload.auth !== "account") {
      window.location.reload()
      throw new MediaRequestError(copy.failed, "local")
    }
    if (!signedIn && payload.refreshToken && quarkRef.current && payload.refreshToken !== quarkRef.current.refreshToken) {
      const next = { ...quarkRef.current, refreshToken: payload.refreshToken }
      quarkRef.current = next
      writeQuark(next)
    }
    return payload
  }

  function publishHistory(items: PlayRecord[]) {
    writeHistory(items)
    setHistory(readHistory())
  }

  async function saveAccountProgress(item: PlayRecord) {
    const result = await call<{ saved: boolean; item: ServerProgress }>("/api/media/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fid: item.fid,
        name: item.name,
        kind: item.kind,
        position: item.position,
        offset: item.offset,
        updatedAt: new Date(item.updatedAt).toISOString(),
      }),
    })
    const saved = toRecord(result.item)
    if (saved) publishHistory(upsertProgress(readHistory(), saved))
    return saved
  }

  async function reconcile(cancelled: () => boolean) {
    quarkRef.current = null
    try {
      const status = await call<CloudStatus>("/api/media/quark")
      if (cancelled()) return
      const guestQuark = readQuark()
      if (!status.linked && guestQuark) {
        try {
          const bound = await call<CloudStatus>("/api/media/quark/token", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ refreshToken: guestQuark.refreshToken, deviceId: guestQuark.deviceId }),
          })
          if (bound.linked) clearQuark()
          if (!cancelled()) setStatus({ linked: bound.linked, displayName: bound.displayName, deviceId: bound.deviceId })
        } catch (error) {
          if (error instanceof MediaRequestError && error.auth !== "account") return
          if (!cancelled()) setStatus(status)
        }
      } else if (!cancelled()) {
        setStatus(status)
      }

      const settings = await call<AssrtSettings>("/api/media/assrt")
      if (cancelled()) return
      const guestAssrt = readAssrt()
      if (!settings.usingOwn && guestAssrt) {
        try {
          const next = await call<AssrtSettings>("/api/media/assrt", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: guestAssrt.token, quotaPerMinute: guestAssrt.quota }),
          })
          if (next.usingOwn) clearLocalAssrt()
          if (!cancelled()) setAssrt(next)
        } catch (error) {
          if (error instanceof MediaRequestError && error.auth !== "account") return
          if (!cancelled()) setAssrt(settings)
        }
      } else if (!cancelled()) {
        setAssrt(settings)
      }

      const cloudPayload = await call<{ items: ServerProgress[] }>("/api/media/progress")
      if (cancelled()) return
      const cloud = cloudPayload.items.flatMap((item) => {
        const record = toRecord(item)
        return record ? [record] : []
      })
      const local = readHistory()
      let merged = mergeProgress(local, cloud)
      let failed = false
      for (const item of pendingUpload(local, cloud)) {
        try {
          const saved = await saveAccountProgress(item)
          if (saved) merged = upsertProgress(merged, saved)
        } catch (error) {
          if (error instanceof MediaRequestError && error.auth !== "account") return
          failed = true
        }
      }
      if (!failed) publishHistory(merged)
      else if (!cancelled()) setHistory(merged)
    } catch (error) {
      if (error instanceof MediaRequestError && error.auth !== "account") window.location.reload()
    }
  }

  useEffect(() => {
    if (signedIn) {
      let cancel = false
      void reconcile(() => cancel)
      return () => {
        cancel = true
      }
    }

    const stored = readQuark()
    if (stored) writeDevice(stored.deviceId)
    quarkRef.current = stored
    setStatus(
      stored
        ? { linked: true, displayName: stored.displayName, deviceId: stored.deviceId }
        : { linked: false, displayName: null, deviceId: null }
    )
    if (!showAssrt(readAssrt())) {
      void call<AssrtSettings>("/api/media/assrt").then(setAssrt).catch(() => undefined)
    }
    setHistory(readHistory())
  }, [signedIn])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (localArea(event.key) !== "history") return
      if (!signedIn) {
        setHistory(readHistory())
        return
      }
      const local = readHistory()
      for (const item of pendingUpload(local, history)) {
        void saveAccountProgress(item).catch((error: unknown) => {
          if (error instanceof MediaRequestError && error.auth !== "account") window.location.reload()
        })
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [signedIn, history])

  useEffect(() => {
    if (!status?.linked) return
    void loadFiles(parent?.fid ?? "0").then((message) => {
      if (!message) return
      setError("")
      setQr(null)
      setQrConnecting(false)
      setQrMessage(message)
      setQrOpen(true)
    })
  }, [status?.linked, parent?.fid])

  useEffect(
    () => () => {
      if (qrPoll.current) window.clearInterval(qrPoll.current)
      if (qrDeadline.current) window.clearTimeout(qrDeadline.current)
    },
    []
  )

  useEffect(() => {
    function onFullscreen() {
      const active = document.fullscreenElement === stageRef.current
      setStageFull(active)
      if (!active) {
        setFullFiles(false)
        setFullSubs(false)
      }
    }
    document.addEventListener("fullscreenchange", onFullscreen)
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
  }, [])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" })
  }, [time])

  const activeId = useMemo(() => {
    const cue = cues.find((item) => time >= item.start + offset && time < item.end + offset)
    return cue?.id ?? null
  }, [cues, offset, time])

  const sidecar = files.find((item) => item.kind === "subtitle" && current && stem(item.name) === stem(current.name))

  async function reloadStatus() {
    if (!signedIn) {
      const stored = readQuark()
      quarkRef.current = stored
      setStatus(
        stored
          ? { linked: true, displayName: stored.displayName, deviceId: stored.deviceId }
          : { linked: false, displayName: null, deviceId: null }
      )
      return
    }

    try {
      setStatus(await call<CloudStatus>("/api/media/quark"))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.failed)
    }
  }

  async function releaseBinding() {
    filesRequest.current += 1
    if (!signedIn) {
      clearQuark()
      quarkRef.current = null
    } else {
      try {
        await call("/api/media/quark", { method: "DELETE" })
      } catch {
        // 服务端解绑失败时仍回到绑定表单，避免停在失效连接上。
      }
    }
    setStatus({ linked: false, displayName: null, deviceId: null })
    setFolder([{ fid: "0", name: copy.root }])
    setListedFid(null)
    setFilesLoading(false)
    setCurrent(null)
    setStreamUrl("")
    setFiles([])
  }

  async function loadFiles(fid: string) {
    const request = ++filesRequest.current
    setFilesLoading(true)
    try {
      const payload = await call<{ files: DriveFile[] }>(`/api/media/quark/files?parentFid=${encodeURIComponent(fid)}`)
      if (filesRequest.current !== request) return null
      setFiles(payload.files)
      setListedFid(fid)
      return null
    } catch (reason) {
      if (filesRequest.current !== request) return null
      const message = reason instanceof Error ? reason.message : copy.failed
      setListedFid(null)
      await releaseBinding()
      return message
    } finally {
      if (filesRequest.current === request) setFilesLoading(false)
    }
  }

  function stopQrPoll() {
    if (qrPoll.current) window.clearInterval(qrPoll.current)
    if (qrDeadline.current) window.clearTimeout(qrDeadline.current)
    qrPoll.current = null
    qrDeadline.current = null
  }

  async function toggleFullscreen() {
    const stage = stageRef.current
    if (!stage) return
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen()
        return
      }
      await stage.requestFullscreen()
    } catch {
      // 浏览器拒绝全屏时保持当前布局。
    }
  }

  function closeQr() {
    stopQrPoll()
    setQr(null)
    setQrMessage("")
    setQrConnecting(false)
    setQrOpen(false)
  }

  async function startQr() {
    setError("")
    setQrMessage("")
    setQrConnecting(false)
    setQr(null)
    setQrOpen(true)
    setBusy(true)
    stopQrPoll()
    try {
      const knownDevice = readDevice() || quarkRef.current?.deviceId || ""
      const started = await call<{ id: string; image: string; deviceId: string }>("/api/media/quark/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: knownDevice }),
      })
      if (started.deviceId) writeDevice(started.deviceId)
      setQr(started.image)
      qrPoll.current = window.setInterval(async () => {
        try {
          const polled = await call<{ status: string; displayName: string | null; refreshToken?: string; deviceId?: string }>(
            `/api/media/quark/qr/${started.id}`
          )
          if (polled.status === "pending") return
          stopQrPoll()
          if (polled.status === "confirmed") {
            if (polled.deviceId) writeDevice(polled.deviceId)
            if (!signedIn && polled.refreshToken && polled.deviceId) {
              const stored = { refreshToken: polled.refreshToken, deviceId: polled.deviceId, displayName: polled.displayName }
              quarkRef.current = stored
              writeQuark(stored)
            }
            setQr(null)
            setQrConnecting(true)
            const message = await loadFiles("0")
            setQrConnecting(false)
            if (message) {
              setQrMessage(message)
              return
            }
            setQrOpen(false)
            await reloadStatus()
            return
          }
          setQr(null)
          setQrMessage(copy.qrExpired)
        } catch (reason) {
          stopQrPoll()
          setQr(null)
          setQrConnecting(false)
          setQrMessage(reason instanceof Error ? reason.message : copy.failed)
        }
      }, 2000)
      qrDeadline.current = window.setTimeout(() => {
        stopQrPoll()
        setQr(null)
        setQrConnecting(false)
        setQrMessage(copy.qrExpired)
      }, 3 * 60 * 1000)
    } catch (reason) {
      setQr(null)
      setQrConnecting(false)
      setQrMessage(reason instanceof Error ? reason.message : copy.failed)
      setQrOpen(true)
    } finally {
      setBusy(false)
    }
  }

  async function bindToken() {
    setError("")
    setBusy(true)
    try {
      const next = await call<CloudStatus>("/api/media/quark/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken, deviceId }),
      })
      if (next.deviceId) writeDevice(next.deviceId)
      if (!signedIn && next.refreshToken && next.deviceId) {
        const stored = { refreshToken: next.refreshToken, deviceId: next.deviceId, displayName: next.displayName }
        quarkRef.current = stored
        writeQuark(stored)
      }
      setStatus({ linked: next.linked, displayName: next.displayName, deviceId: next.deviceId })
      setRefreshToken("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.failed)
    } finally {
      setBusy(false)
    }
  }

  async function unlink() {
    setError("")
    await releaseBinding()
  }

  function openFolder(file: DriveFile) {
    setFolder((stack) => [...stack, { fid: file.fid, name: file.name }])
  }

  async function openFile(file: DriveFile) {
    setError("")
    armedRef.current = false
    savedAt.current = 0
    const saved = history.find((item) => item.fid === file.fid)
    if (saved) setOffset(saved.offset)
    setCurrent(file)
    setCues([])
    setSource(null)
    setHits([])
    setTime(0)
    try {
      const payload = await call<{ ticket: string }>("/api/media/quark/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid: file.fid }),
      })
      setStreamUrl(`/api/media/stream?ticket=${encodeURIComponent(payload.ticket)}`)
    } catch (reason) {
      setStreamUrl("")
      setError(reason instanceof Error ? reason.message : copy.failed)
    }
  }

  function guestAssrt() {
    if (signedIn) return {}
    const own = readAssrt()
    return own ? { token: own.token, quotaPerMinute: own.quota } : {}
  }

  async function remember(file: DriveFile, position: number) {
    if (file.kind !== "video" && file.kind !== "audio") return
    const next: PlayRecord = { fid: file.fid, name: file.name, kind: file.kind, position, offset, updatedAt: Date.now() }
    if (!signedIn) {
      publishHistory(upsertProgress(readHistory(), next))
      return
    }

    try {
      await saveAccountProgress(next)
    } catch (error) {
      if (error instanceof MediaRequestError && error.auth !== "account") window.location.reload()
    }
  }

  function onReady(event: SyntheticEvent<HTMLMediaElement>) {
    const saved = current ? history.find((item) => item.fid === current.fid) : null
    const media = event.currentTarget
    if (saved && saved.position > 1 && (!Number.isFinite(media.duration) || saved.position < media.duration - 1)) {
      media.currentTime = saved.position
    }
    armedRef.current = true
  }

  function onTime(event: SyntheticEvent<HTMLMediaElement>) {
    const position = event.currentTarget.currentTime
    setTime(position)
    if (!armedRef.current || !current) return
    const now = Date.now()
    if (now - savedAt.current < 5000) return
    savedAt.current = now
    void remember(current, position)
  }

  function applyText(text: string, nextSource: SubtitleSource) {
    const parsed = parseSubtitles(text)
    if (parsed.length === 0) {
      setError(copy.noTiming)
      return
    }
    setCues(parsed)
    setSource(nextSource)
    setError("")
  }

  async function loadSidecar() {
    if (!sidecar) return
    const payload = await call<{ text: string }>("/api/media/quark/subtitle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fid: sidecar.fid }),
    })
    applyText(payload.text, "sidecar")
  }

  async function loadUrl() {
    const payload = await call<{ text: string }>("/api/media/subtitles/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: subtitleUrl }),
    })
    applyText(payload.text, "url")
  }

  async function searchAssrt() {
    if (!current) return
    setError("")
    try {
      const payload = await call<{ hits: SubtitleHit[] }>("/api/media/subtitles/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: current.name, ...guestAssrt() }),
      })
      setHits(payload.hits)
      const only = payload.hits[0]
      if (payload.hits.length === 1 && only) {
        await chooseHit(only.id)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.failed)
    }
  }

  async function chooseHit(id: string) {
    const payload = await call<{ text: string }>("/api/media/subtitles/assrt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...guestAssrt() }),
    })
    applyText(payload.text, "assrt")
  }

  async function onLocalFile(file: File | null) {
    if (!file) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    applyText(decodeSubtitleBytes(bytes), "local")
  }

  function seek(start: number) {
    const media = mediaRef.current
    if (!media) return
    media.currentTime = Math.max(0, start + offset)
    void media.play().catch(() => undefined)
  }

  async function saveAssrt() {
    setError("")
    const quota = Number(ownQuota)
    if (!signedIn) {
      const token = ownToken.trim()
      if (token.length < 16 || !Number.isFinite(quota) || quota < 1 || quota > 600) {
        setError(copy.failed)
        return
      }
      writeAssrt({ token, quota })
      setAssrt({ usingOwn: true, quotaPerMinute: quota, tokenTail: token.slice(-4) })
      setOwnToken("")
      return
    }

    try {
      const next = await call<AssrtSettings>("/api/media/assrt", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ownToken, quotaPerMinute: quota }),
      })
      setAssrt(next)
      setOwnToken("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.failed)
    }
  }

  async function clearAssrt() {
    if (!signedIn) {
      clearLocalAssrt()
      const next = await call<AssrtSettings>("/api/media/assrt")
      setAssrt(next)
      return
    }

    const next = await call<AssrtSettings>("/api/media/assrt", { method: "DELETE" })
    setAssrt(next)
  }

  const native = current ? nativeExt.has(extension(current.name)) : true

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:px-8 lg:px-10">
      <header className="animate-[fade-up_0.7s_ease-out_both]">
        <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
          <span aria-hidden className="bg-primary size-1.5 rounded-full" />
          {copy.eyebrow}
        </p>
        <h1 className="text-foreground mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">{copy.lead}</p>
        {signedIn ? null : <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">{copy.localNote}</p>}
      </header>

      {error ? <p className={cn(authAlertClass, "mt-6")}>{error}</p> : null}

      <div
        ref={stageRef}
        className={cn(
          "relative mt-8 grid gap-4 lg:items-stretch",
          !stageFull && "lg:h-[36rem]",
          stageFull && "mt-0 h-dvh gap-0 overflow-hidden bg-background",
          stageFull && fullSubs && "grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]",
          stageFull && !fullSubs && "grid-cols-1",
          !stageFull && filesOpen && subsOpen && "lg:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1.25fr)_minmax(16rem,0.93fr)]",
          !stageFull && filesOpen && !subsOpen && "lg:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1fr)_auto]",
          !stageFull && !filesOpen && subsOpen && "lg:grid-cols-[auto_minmax(0,1.25fr)_minmax(16rem,0.93fr)]",
          !stageFull && !filesOpen && !subsOpen && "lg:grid-cols-[auto_minmax(0,1fr)_auto]"
        )}
      >
        {stageFull && fullFiles ? (
          <button type="button" className="absolute inset-0 z-20 bg-black/35" aria-label={copy.collapse} onClick={() => setFullFiles(false)} />
        ) : null}
        {stageFull ? (
          <div className="absolute top-3 left-3 z-40 flex gap-2">
            <Button type="button" size="sm" className="rounded-full" variant={fullFiles ? "default" : "secondary"} aria-pressed={fullFiles} onClick={() => setFullFiles((open) => !open)}>
              {copy.files}
            </Button>
            <Button type="button" size="sm" className="rounded-full" variant={fullSubs ? "default" : "secondary"} aria-pressed={fullSubs} onClick={() => setFullSubs((open) => !open)}>
              {copy.subtitles}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={() => void toggleFullscreen()}>
              {copy.exitFullscreen}
            </Button>
          </div>
        ) : null}
        {!stageFull && !filesOpen ? (
          <button
            type="button"
            className="bg-card text-foreground/80 ring-border hover:text-primary rounded-xl px-3 py-4 text-sm shadow-sm ring-1 lg:[writing-mode:vertical-rl]"
            onClick={() => setFilesOpen(true)}
          >
            {copy.files}
          </button>
        ) : null}
        {(!stageFull && filesOpen) || (stageFull && fullFiles) ? (
        <Card
          className={cn(
            "border-0 bg-card shadow-sm ring-1 ring-border lg:h-full",
            stageFull && fullFiles && "absolute inset-y-0 left-0 z-30 w-[min(24rem,88vw)] overflow-y-auto rounded-none shadow-2xl"
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-foreground/80 text-lg font-medium">{stageFull ? copy.files : copy.quarkTitle}</CardTitle>
                <CardDescription>
                  {status?.linked ? copy.linked.replace("{name}", status.displayName || copy.quarkTitle) : copy.quarkLead}
                </CardDescription>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" className="rounded-full" aria-label={copy.collapse} onClick={() => (stageFull ? setFullFiles(false) : setFilesOpen(false))}>
                <PanelLeftClose />
              </Button>
            </div>
          </CardHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-5">
            {status?.linked ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void unlink()}>
                  {copy.unlink}
                </Button>
                {folder.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setFolder((stack) => stack.slice(0, -1))}
                  >
                    {copy.back}
                  </Button>
                ) : null}
                <p className="text-muted-foreground text-sm">{folder.map((item) => item.name).join(" / ")}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <Button type="button" className={authPrimaryButtonClass} disabled={busy || qrOpen} onClick={() => void startQr()}>
                  {copy.qr}
                </Button>
                <Dialog
                  open={qrOpen}
                  onOpenChange={(open) => {
                    if (!open) closeQr()
                  }}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{copy.qr}</DialogTitle>
                      <DialogDescription>{copy.qrHint}</DialogDescription>
                    </DialogHeader>
                    <div className="flex min-h-56 flex-col items-center justify-center gap-3">
                      {qr ? <img src={qr} alt={copy.qrWaiting} className="size-56 rounded-xl bg-white p-2" /> : null}
                      {!qr && !qrMessage ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-3" role="status">
                          <LoaderCircle aria-hidden className="text-primary size-6 animate-spin" />
                          <p className="text-sm">{qrConnecting ? copy.qrConnecting : copy.qrLoading}</p>
                        </div>
                      ) : null}
                      {qrMessage ? <p className={authAlertClass}>{qrMessage}</p> : null}
                      {qrMessage?.includes("设备") ? <p className="text-muted-foreground text-center text-sm leading-relaxed">{copy.qrSameDevice}</p> : null}
                      {qrMessage ? (
                        <div className="flex gap-2">
                          <Button type="button" className="rounded-full" disabled={busy} onClick={() => void startQr()}>
                            {copy.qrRefresh}
                          </Button>
                          <Button type="button" variant="outline" className="rounded-full" onClick={closeQr}>
                            {copy.qrClose}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </DialogContent>
                </Dialog>
                <Input className={authFieldClass} value={refreshToken} placeholder={copy.refreshToken} onChange={(event) => setRefreshToken(event.target.value)} />
                <Input className={authFieldClass} value={deviceId} placeholder={copy.deviceId} onChange={(event) => setDeviceId(event.target.value)} />
                <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => void bindToken()}>
                  {copy.bind}
                </Button>
              </div>
            )}

            {status?.linked && (filesLoading || listedFid !== (parent?.fid ?? "0")) ? (
              <div className="text-muted-foreground mt-4 flex min-h-0 flex-1 items-center justify-center gap-2 text-sm" role="status">
                <LoaderCircle aria-hidden className="text-primary size-4 animate-spin" />
                {copy.filesLoading}
              </div>
            ) : null}
            {status?.linked && !filesLoading && listedFid === (parent?.fid ?? "0") ? (
              <ul className="mt-4 min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto overscroll-contain pr-1">
                {files.length === 0 ? <li className="text-muted-foreground py-3 text-sm">{copy.empty}</li> : null}
                {files.map((file) => (
                  <li key={file.fid}>
                    <button
                      type="button"
                      className="hover:text-primary flex w-full items-center gap-2.5 py-2.5 text-left text-sm"
                      onClick={() => (file.kind === "folder" ? openFolder(file) : void openFile(file))}
                    >
                      <FileKindIcon kind={file.kind} />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">{copy.kinds[file.kind]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {history.length > 0 ? (
              <div className="mt-4">
                <p className="text-muted-foreground text-xs">{copy.history}</p>
                <ul className="mt-1">
                  {history.map((item) => (
                    <li key={item.fid}>
                      <button
                        type="button"
                        className="hover:text-primary w-full truncate py-1.5 text-left text-sm"
                        onClick={() => void openFile({ fid: item.fid, name: item.name, size: 0, kind: item.kind })}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
        ) : null}

        <Card className={cn("border-0 bg-card shadow-sm ring-1 ring-border lg:h-full", stageFull && "flex h-full flex-col rounded-none bg-black shadow-none ring-0")}>
          {stageFull ? null : (
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-foreground/80 text-lg font-medium">{current?.name || copy.player}</CardTitle>
                {current && !native ? <CardDescription>{copy.browserHint}</CardDescription> : null}
                {current ? null : <CardDescription>{copy.idle}</CardDescription>}
              </div>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => void toggleFullscreen()}>
                {copy.fullscreen}
              </Button>
            </div>
          </CardHeader>
          )}
          <div className={cn("flex min-h-0 flex-1 flex-col px-4 pb-5", stageFull && "p-0")}>
            {current?.kind === "video" && streamUrl ? (
              <video
                key={streamUrl}
                ref={(node) => {
                  mediaRef.current = node
                }}
                className={cn("bg-foreground/5 w-full rounded-xl object-contain", stageFull ? "min-h-0 flex-1" : "aspect-video lg:aspect-auto lg:min-h-0 lg:flex-1")}
                src={streamUrl}
                controls
                controlsList="nofullscreen"
                onLoadedMetadata={onReady}
                onTimeUpdate={onTime}
              />
            ) : null}
            {current?.kind === "audio" && streamUrl ? (
              <audio
                key={streamUrl}
                ref={(node) => {
                  mediaRef.current = node
                }}
                className="w-full"
                src={streamUrl}
                controls
                controlsList="nofullscreen"
                onLoadedMetadata={onReady}
                onTimeUpdate={onTime}
              />
            ) : null}
            {streamUrl ? null : <div className={cn("bg-foreground/5 rounded-xl", stageFull ? "min-h-0 flex-1" : "aspect-video lg:aspect-auto lg:min-h-0 lg:flex-1")} />}
          </div>
        </Card>

        {!stageFull && !subsOpen ? (
          <button
            type="button"
            className="bg-card text-foreground/80 ring-border hover:text-primary rounded-xl px-3 py-4 text-sm shadow-sm ring-1 lg:[writing-mode:vertical-rl]"
            onClick={() => setSubsOpen(true)}
          >
            {copy.subtitles}
          </button>
        ) : null}
        {(!stageFull && subsOpen) || (stageFull && fullSubs) ? (
        <Card className={cn("border-0 bg-card shadow-sm ring-1 ring-border lg:h-full", stageFull && fullSubs && "h-full overflow-y-auto rounded-none")}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-foreground/80 text-lg font-medium">{copy.subtitles}</CardTitle>
                <CardDescription>{copy.subtitleLead}</CardDescription>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" className="rounded-full" aria-label={copy.collapse} onClick={() => (stageFull ? setFullSubs(false) : setSubsOpen(false))}>
                <PanelRightClose />
              </Button>
            </div>
          </CardHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-5">
            <div className="flex flex-wrap gap-2">
              <label className="border-border inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs">
                {copy.localFile}
                <input
                  className="sr-only"
                  type="file"
                  accept=".srt,.ass,.ssa,.vtt,text/plain"
                  onChange={(event) => void onLocalFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {sidecar ? (
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void loadSidecar()}>
                  {copy.sidecar}
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={!current} onClick={() => void searchAssrt()}>
                {copy.search}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input className={authFieldClass} value={subtitleUrl} placeholder={copy.url} onChange={(event) => setSubtitleUrl(event.target.value)} />
              <Button type="button" variant="outline" className="rounded-full" onClick={() => void loadUrl()}>
                {copy.loadUrl}
              </Button>
            </div>
            <label className="text-muted-foreground flex items-center gap-2 text-xs">
              {copy.offset}
              <Input
                className="h-8 w-24 rounded-xl"
                type="number"
                step="0.1"
                value={offset}
                onChange={(event) => setOffset(Number(event.target.value) || 0)}
              />
            </label>

            {hits.length > 1 ? (
              <ul className="space-y-1">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button type="button" className="hover:text-primary text-left text-sm" onClick={() => void chooseHit(hit.id)}>
                      {hit.title}
                      {hit.language ? ` · ${hit.language}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {cues.length === 0 ? <p className="text-muted-foreground text-sm">{copy.noCue}</p> : null}
              {cues.map((cue) => (
                <button
                  key={cue.id}
                  ref={cue.id === activeId ? activeRef : undefined}
                  type="button"
                  className={cn(
                    "block w-full rounded-lg px-2 py-1.5 text-left text-sm leading-relaxed",
                    cue.id === activeId ? "bg-primary/12 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => seek(cue.start)}
                >
                  {cue.text}
                </button>
              ))}
            </div>
            {source === "assrt" ? (
              <p className="text-muted-foreground text-xs">
                {copy.assrtCredit}{" "}
                <a className="underline underline-offset-4" href="https://assrt.net" target="_blank" rel="noreferrer">
                  assrt.net
                </a>
              </p>
            ) : null}
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground hover:bg-muted ml-auto flex size-8 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden">
                <Settings aria-hidden className="size-4" />
                <span className="sr-only">{copy.advanced}</span>
              </summary>
              <div className="mt-3 grid gap-3">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {assrt?.usingOwn
                    ? copy.assrtOwn.replace("{quota}", String(assrt.quotaPerMinute)).replace("{tail}", assrt.tokenTail || "")
                    : copy.assrtSite.replace("{quota}", String(assrt?.quotaPerMinute ?? 5))}
                </p>
                <Input className={authFieldClass} value={ownToken} placeholder={copy.assrtToken} onChange={(event) => setOwnToken(event.target.value)} />
                <Input
                  className={authFieldClass}
                  type="number"
                  min={1}
                  value={ownQuota}
                  disabled={ownToken.trim().length === 0}
                  placeholder={copy.assrtQuota}
                  onChange={(event) => setOwnQuota(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" className="rounded-full" disabled={ownToken.trim().length === 0} onClick={() => void saveAssrt()}>
                    {copy.saveAssrt}
                  </Button>
                  {assrt?.usingOwn ? (
                    <Button type="button" variant="outline" className="rounded-full" onClick={() => void clearAssrt()}>
                      {copy.clearAssrt}
                    </Button>
                  ) : null}
                </div>
              </div>
            </details>
          </div>
        </Card>
        ) : null}
      </div>
    </main>
  )
}
