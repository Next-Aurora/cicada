import { encodeChunk } from "./protocol"

export async function streamFile(dc: RTCDataChannel, file: File, transferId: string, startOffset = 0): Promise<void> {
  dc.binaryType = "arraybuffer"
  const CHUNK = 48 * 1024
  const HIGH_WATER = 1024 * 1024
  let offset = startOffset
  let seq = 0

  while (offset < file.size) {
    while (dc.bufferedAmount > HIGH_WATER) await new Promise((r) => setTimeout(r, 20))

    const slice = file.slice(offset, Math.min(offset + CHUNK, file.size))
    const payload = await slice.arrayBuffer()
    const isLast = offset + payload.byteLength >= file.size

    dc.send(encodeChunk({ transferId, chunkIndex: seq++, fileOffset: offset, isLast }, payload))
    offset += payload.byteLength
  }
}
