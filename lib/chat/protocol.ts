export interface ChunkMeta {
  transferId: string
  chunkIndex: number
  fileOffset: number
  isLast: boolean
}
export function encodeChunk(meta: ChunkMeta, payload: ArrayBuffer): ArrayBuffer {
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta))
  const frame = new ArrayBuffer(4 + metaBytes.byteLength + payload.byteLength)
  const view = new DataView(frame)
  view.setUint32(0, metaBytes.byteLength, false)
  new Uint8Array(frame, 4, metaBytes.byteLength).set(metaBytes)
  new Uint8Array(frame, 4 + metaBytes.byteLength).set(new Uint8Array(payload))
  return frame
}
export function decodeChunk(frame: ArrayBuffer): { meta: ChunkMeta; payload: ArrayBuffer } {
  const view = new DataView(frame)
  const metaLen = view.getUint32(0, false)
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(frame, 4, metaLen))) as ChunkMeta
  return { meta, payload: frame.slice(4 + metaLen) }
}
