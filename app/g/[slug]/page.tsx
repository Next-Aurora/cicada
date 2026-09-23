import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getGuide, guideExists, listGuides } from "lib/guides"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return listGuides().map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: "攻略未找到" }

  const description =
    [guide.destination, guide.dates, guide.summary].filter(Boolean).join(" · ") ||
    "逆蝉旅行攻略"

  return {
    title: guide.title,
    description,
    openGraph: {
      title: guide.title,
      description,
      type: "article",
      locale: "zh_CN",
    },
    twitter: {
      card: "summary",
      title: guide.title,
      description,
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide || !guideExists(slug)) notFound()

  const src = `/guides/${slug}/index.html`
  const label = guide.title

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-cicada-bg)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-cicada-hairline)] bg-[var(--color-cicada-surface)] px-4 py-2">
        <Link href="/guides" className="text-sm font-semibold text-[var(--color-cicada-accent)] hover:underline">
          ← 旅行攻略
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-cicada-muted)]" title={label}>
          {label}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 text-sm text-[var(--color-cicada-muted)] hover:text-[var(--color-cicada-accent)]"
        >
          单独打开
        </a>
      </header>
      <iframe title={label} src={src} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
