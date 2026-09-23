import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export type GuideMeta = {
  slug: string
  title: string
  destination?: string
  dates?: string
  summary?: string
  ogImage?: string
}

function guidesDir(): string {
  return join(process.cwd(), "public", "guides")
}

export function listGuides(): GuideMeta[] {
  const root = guidesDir()
  if (!existsSync(root)) return []

  const out: GuideMeta[] = []
  for (const slug of readdirSync(root)) {
    const dir = join(root, slug)
    if (!statSync(dir).isDirectory()) continue
    if (!existsSync(join(dir, "index.html"))) continue

    let meta: Partial<GuideMeta> = {}
    const metaPath = join(dir, "meta.json")
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(readFileSync(metaPath, "utf8")) as Partial<GuideMeta>
      } catch {
        /* ignore bad meta */
      }
    }

    out.push({
      slug,
      title: meta.title || slug,
      destination: meta.destination,
      dates: meta.dates,
      summary: meta.summary,
      ogImage: meta.ogImage,
    })
  }

  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function guideExists(slug: string): boolean {
  return existsSync(join(guidesDir(), slug, "index.html"))
}

export function getGuide(slug: string): GuideMeta | null {
  const dir = join(guidesDir(), slug)
  if (!existsSync(join(dir, "index.html"))) return null

  let meta: Partial<GuideMeta> = {}
  const metaPath = join(dir, "meta.json")
  if (existsSync(metaPath)) {
    try {
      meta = JSON.parse(readFileSync(metaPath, "utf8")) as Partial<GuideMeta>
    } catch {
      /* ignore bad meta */
    }
  }

  return {
    slug,
    title: meta.title || slug,
    destination: meta.destination,
    dates: meta.dates,
    summary: meta.summary,
    ogImage: meta.ogImage,
  }
}
