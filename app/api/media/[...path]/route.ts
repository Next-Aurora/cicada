import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ path: string[] }> }

async function proxy(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })

  const base = process.env.CICADA_API_URL?.trim().replace(/\/$/, "")
  const token = process.env.CICADA_INTERNAL_TOKEN?.trim()
  if (!base || !token) {
    return NextResponse.json({ message: "播放服务未配置" }, { status: 503 })
  }

  const { path } = await context.params
  const incoming = new URL(request.url)
  const target = `${base}/media/${path.join("/")}${incoming.search}`
  const upstreamHeaders = new Headers()
  upstreamHeaders.set("x-cicada-internal-token", token)
  if (session?.user) {
    upstreamHeaders.set("x-cicada-user-id", session.user.id)
  } else {
    const refresh = request.headers.get("x-cicada-quark-refresh")
    const device = request.headers.get("x-cicada-quark-device")
    if (refresh) upstreamHeaders.set("x-cicada-quark-refresh", refresh)
    if (device) upstreamHeaders.set("x-cicada-quark-device", device)
  }
  const range = request.headers.get("range")
  if (range) upstreamHeaders.set("range", range)
  const contentType = request.headers.get("content-type")
  if (contentType) upstreamHeaders.set("content-type", contentType)

  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  const upstream = await fetch(target, {
    method: request.method,
    headers: upstreamHeaders,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  })

  const outgoing = new Headers()
  outgoing.set("x-cicada-auth", session?.user ? "account" : "local")
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"]) {
    const value = upstream.headers.get(name)
    if (value) outgoing.set(name, value)
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: outgoing })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
