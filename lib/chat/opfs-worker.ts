import { createSHA256 } from "hash-wasm"
let syncHandle: any = null
let writable: any = null
let hasher: any = null
let written = 0

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data
  if (type === "init") {
    const { fileHandle } = e.data
    hasher = await createSHA256()
    // 优先同步句柄 (Safari 必须)，降级 WritableStream
    if (typeof (fileHandle as any).createSyncAccessHandle === "function") {
      try {
        syncHandle = await (fileHandle as any).createSyncAccessHandle()
        syncHandle.truncate(0)
        self.postMessage({ type: "ready" })
        return
      } catch {
        syncHandle = null
      }
    }
    if (typeof fileHandle.createWritable === "function") {
      writable = await fileHandle.createWritable({ keepExistingData: true })
      self.postMessage({ type: "ready" })
      return
    }
  }
  if (type === "chunk") {
    const { fileOffset, payload } = e.data
    const bytes = new Uint8Array(payload)
    if (syncHandle) syncHandle.write(bytes, { at: fileOffset })
    else if (writable) await writable.write({ type: "write", position: fileOffset, data: bytes })
    hasher.update(bytes)
    written += bytes.byteLength
    self.postMessage({ type: "progress", written })
  }
  if (type === "finish") {
    if (syncHandle) {
      syncHandle.flush()
      syncHandle.close()
    } else if (writable) await writable.close()
    self.postMessage({ type: "done", sha256: hasher.digest("hex") })
  }
}
