"use client"
import * as signalR from "@microsoft/signalr"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

// 协议常量
const CHUNK_SIZE = 48 * 1024 // 48KB 网络块
const HIGH_WATER_MARK = 1024 * 1024 // 1MB 背压高水位线

interface ChatMessage {
  Id: number
  User: string
  Text: string
  FileId?: string
}

function ChatRoomInner() {
  const params = useParams()
  const search = useSearchParams()
  const roomCode = (params.code as string) || ""
  const userName = search.get("user") || "匿名"

  // UI 状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState("连接中...")

  // WebRTC & SignalR 实例引用
  const connRef = useRef<signalR.HubConnection | null>(null)
  // 管理多个 peer 的 DataChannel: peerId -> RTCDataChannel
  const channelsRef = useRef<Map<string, RTCDataChannel>>(new Map())
  // 管理文件接收缓冲区: transferId -> ArrayBuffer[]
  const receiveBuffersRef = useRef<Map<string, ArrayBuffer[]>>(new Map())
  const myIdRef = useRef<string>("")

  useEffect(() => {
    // 生成一个设备 ID 传给后端 Hub
    const deviceId = crypto.randomUUID()

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`http://localhost:5000/hubs/chat?deviceId=${deviceId}`, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build()
    connRef.current = conn

    // 1. 初始化 WebRTC 基础配置
    const rtcConfig: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }

    // 2. 核心方法：创建一个 PeerConnection
    const createPeerConnection = (peerId: string) => {
      const pc = new RTCPeerConnection(rtcConfig)

      // 处理 ICE 候选
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          conn.invoke("SendSignal", peerId, "ice", JSON.stringify(event.candidate)).catch(console.error)
        }
      }

      // 处理数据通道 (如果是对端发起的，这里会触发)
      pc.ondatachannel = (event) => {
        const dc = event.channel
        setupDataChannel(dc, peerId)
      }

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          channelsRef.current.delete(peerId)
          setStatus(`与 ${peerId.slice(0, 4)} 断开连接`)
        }
      }

      return pc
    }

    // 3. 核心方法：设置 DataChannel 的监听
    const setupDataChannel = (dc: RTCDataChannel, peerId: string) => {
      dc.binaryType = "arraybuffer"
      channelsRef.current.set(peerId, dc)

      dc.onopen = () => setStatus("P2P 通道已建立，可以传文件了！")
      dc.onclose = () => channelsRef.current.delete(peerId)

      dc.onmessage = (event) => {
        // 接收字符串控制帧
        if (typeof event.data === "string") {
          const msg: { type: string; transferId: string } = JSON.parse(event.data) as { type: string; transferId: string }
          if (msg.type === "file-meta") {
            // 准备接收文件
            receiveBuffersRef.current.set(msg.transferId, [])
          } else if (msg.type === "file-done") {
            // 文件接收完成，组装 Blob
            const buffers = receiveBuffersRef.current.get(msg.transferId) || []
            const blob = new Blob(buffers)
            const url = URL.createObjectURL(blob)
            setFileUrls((prev) => ({ ...prev, [msg.transferId]: url }))
            receiveBuffersRef.current.delete(msg.transferId)
          }
          return
        }

        // 接收二进制数据帧
        if (event.data instanceof ArrayBuffer) {
          const view = new DataView(event.data)
          // 读取前 4 字节的 transferId 长度
          const idLen = view.getUint32(0, false)
          const idBytes = new Uint8Array(event.data, 4, idLen)
          const transferId = new TextDecoder().decode(idBytes)
          // 剩余部分是实际文件数据
          const payload = event.data.slice(4 + idLen)

          const buffers = receiveBuffersRef.current.get(transferId)
          if (buffers) buffers.push(payload)
        }
      }
    }

    // 4. 监听 SignalR 事件
    // 别人进来了，我是老成员，我发起 Offer
    conn.on("PeerJoined", async (peerId: string) => {
      setStatus(`新成员 ${peerId.slice(0, 4)} 加入，正在建立 P2P...`)
      const pc = createPeerConnection(peerId)

      // 我主动创建 DataChannel
      const dc = pc.createDataChannel("file")
      setupDataChannel(dc, peerId)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      conn.invoke("SendSignal", peerId, "offer", JSON.stringify(offer)).catch(console.error)
    })

    // 收到信令 (Offer/Answer/ICE)
    conn.on("ReceiveSignal", async (senderId: string, type: string, payload: string) => {
      // 简化处理：这里为了演示直接找已有的 PC 或新建。实际工程需要用 Map 严格管理 PC 实例。
      // 如果是新来的，直接建立一个新的 PC（此处省略了严格的复用池管理，以便代码紧凑）。
      const pc = createPeerConnection(senderId)

      if (type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload) as RTCSessionDescriptionInit))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        conn.invoke("SendSignal", senderId, "answer", JSON.stringify(answer)).catch(console.error)
      } else if (type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload) as RTCSessionDescriptionInit))
      } else if (type === "ice") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(payload) as RTCLocalIceCandidateInit ))
        } catch (e) {
          console.error("ICE 添加失败", e)
        }
      }
    })

    // 文本消息接收
    conn.on("MessageCreated", (msg: any) => {
      setMessages((prev) => {
        if (prev.find((m) => m.Id === msg.id)) return prev // 去重
        return [...prev, msg]
      })
    })

    // 5. 启动连接并加入房间
    conn
      .start()
      .then(async () => {
        myIdRef.current = conn.connectionId || ""
        await conn.invoke("JoinRoom", roomCode, userName)
        setStatus("已进入房间")
      })
      .catch((err) => setStatus("连接失败"))

    return () => {
      conn.stop()
      channelsRef.current.forEach((dc) => dc.close())
    }
  }, [roomCode, userName])

  // 发送文本消息
  const sendMessage = async () => {
    if (!text.trim() || !connRef.current) return
    await connRef.current.invoke("SendMessage", roomCode, userName, text, crypto.randomUUID())
    setText("")
  }

  // 发送文件
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = "" // 清空 input

    const transferId = crypto.randomUUID()
    const messageText = `[文件] ${file.name}`

    // 1. 先把文字提示发到服务端
    await connRef.current?.invoke("SendMessage", roomCode, userName, messageText, crypto.randomUUID())

    // 2. 通过 P2P 发送真实文件数据
    channelsRef.current.forEach(async (dc, peerId) => {
      if (dc.readyState !== "open") return

      // 发送元数据
      dc.send(JSON.stringify({ type: "file-meta", transferId, name: file.name, size: file.size, mime: file.type }))

      // 分块读取并发送 (带背压)
      let offset = 0
      while (offset < file.size) {
        // 等待缓冲区排空
        while (dc.bufferedAmount > HIGH_WATER_MARK) {
          await new Promise((r) => setTimeout(r, 50))
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE)
        const buffer = await slice.arrayBuffer()

        // 组装：[4字节ID长度][ID字符串][文件数据]
        const idBytes = new TextEncoder().encode(transferId)
        const frame = new Uint8Array(4 + idBytes.length + buffer.byteLength)
        new DataView(frame.buffer).setUint32(0, idBytes.length, false)
        frame.set(idBytes, 4)
        frame.set(new Uint8Array(buffer), 4 + idBytes.length)

        dc.send(frame.buffer)
        offset += buffer.byteLength
      }

      // 发送完成标识
      dc.send(JSON.stringify({ type: "file-done", transferId }))
    })
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h2>
        房间 {roomCode} — {userName}
      </h2>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>状态: {status}</div>

      <div
        style={{
          height: 400,
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: 10,
          marginBottom: 10,
          borderRadius: 8,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>{m.User}: </strong>
            <span>{m.Text}</span>
            {/* 如果这是一个文件消息，检查是否已经收到 P2P 文件 */}
            {m.Text.startsWith("[文件]") && (
              <span style={{ marginLeft: 10 }}>
                {/* 用 transferId 匹配，这里简单用文本匹配对应 */}
                <a href="#" style={{ color: "blue", textDecoration: "underline" }}>
                  等待 P2P 传输...
                </a>
              </span>
            )}
          </div>
        ))}
        {/* 渲染已接收到的文件下载链接 */}
        {Object.entries(fileUrls).map(([id, url]) => (
          <div key={id} style={{ marginBottom: 8 }}>
            <a href={url} download={`file-${id}`} style={{ color: "green", fontWeight: "bold" }}>
              📎 点击下载接收到的文件
            </a>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="输入消息..."
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button onClick={sendMessage} style={{ padding: "8px 16px" }}>
          发送
        </button>
        <label
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            cursor: "pointer",
            borderRadius: 4,
            background: "#f9f9f9",
          }}
        >
          📎 传文件
          <input type="file" hidden onChange={handleFileUpload} />
        </label>
      </div>
    </main>
  )
}

export default function ChatRoomPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>加载中...</div>}>
      <ChatRoomInner />
    </Suspense>
  )
}
